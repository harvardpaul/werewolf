import { Context } from "koa";
import io from "src";
import { createError } from "src/middleware/handleError";
import { Player } from "src/models/PlayerModel";
import { Room } from "src/models/RoomModel";
import { getVoteResult } from "src/utils/getVoteResult";
import { renderHintNPlayers } from "src/utils/renderHintNplayers";

import { GameStatus, TIMEOUT } from "../../../../../werewolf-frontend/shared/GameDefs";
import { index } from "../../../../../werewolf-frontend/shared/ModelDefs";
import { Events } from "../../../../../werewolf-frontend/shared/WSEvents";
import { ChangeStatusMsg } from "../../../../../werewolf-frontend/shared/WSMsg/ChangeStatus";
import { GameActHandler, Response, startCurrentState } from "./";
import { nextStateOfSheriffVote } from "./ChangeStateHandler";
import { SheriffSpeachHandler } from "./SheriffSpeach";
import { SheriffVoteCheckHandler } from "./SheriffVoteCheck";

export const SheriffVoteHandler: GameActHandler = {
  curStatus: GameStatus.SHERIFF_VOTE,

  async handleHttpInTheState(
    room: Room,
    player: Player,
    target: index,
    ctx: Context
  ) {
    if (!room.getPlayerByIndex(target)?.isElecting)
      createError({ status: 400, msg: "选择的玩家未参与竞选" });

    player.sheriffVotes[0] = target;

    return {
      status: 200,
      msg: "ok",
      data: { target },
    };
  },

  startOfState(room: Room) {
    startCurrentState(this, room);
  },

  async endOfState(room: Room) {
    const votes = room.players.map((p) => p.sheriffVotes[0]);

    // 找到警长人选
    const highestVotes = getVoteResult(votes);

    // 如果没有全部弃票
    if (!highestVotes || highestVotes.length === 0) {
      // 如果所有人都弃票
      // 直接进入白天
      io.to(room.roomNumber).emit(Events.SHOW_MSG, {
        innerHTML: "所有人都弃票, 即将进入自由发言阶段",
      });
      return SheriffVoteCheckHandler.startOfState(room);
    } else if (highestVotes.length === 1) {
      // 如果有票数最高的人
      // 此人当选, 进入白天
      room.getPlayerByIndex(highestVotes[0]).isSheriff = true;
      io.to(room.roomNumber).emit(Events.SHOW_MSG, {
        innerHTML: renderHintNPlayers(
          "当选警长的玩家为:",
          highestVotes
        ),
      });
      return SheriffVoteCheckHandler.startOfState(room);
    } else {
      // 如果多人平票
      // 设置参与警长竞选的人是他们几个
      room.players.forEach((p) => {
        if (p.index in highestVotes) p.isElecting = true;
        else p.isElecting = false;
      });
      // 设置他们未结束发言
      room.finishCurState = new Set();
      // 告知所有人现在应该再依次投票
      io.to(room.roomNumber).emit(Events.SHOW_MSG, {
        innerHTML: renderHintNPlayers(
          "竞争警长的玩家如下, 请再次依次进行发言",
          highestVotes
        ),
      });
      // 设置下一阶段为警长发言
      return SheriffSpeachHandler.startOfState(room);
    }
  },
};
