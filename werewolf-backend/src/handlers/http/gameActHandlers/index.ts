import { Context } from "koa";
import io from "src";

import { GameStatus, TIMEOUT } from "../../../../../werewolf-frontend/shared/GameDefs";
import { index } from "../../../../../werewolf-frontend/shared/ModelDefs";
import { Events } from "../../../../../werewolf-frontend/shared/WSEvents";
import { ChangeStatusMsg } from "../../../../../werewolf-frontend/shared/WSMsg/ChangeStatus";
import { Player } from "../../../models/PlayerModel";
import { Room } from "../../../models/RoomModel";
import { BeforeDayDiscussHandler } from "./BeforeDayDiscuss";
import { GetNextState } from "./ChangeStateHandler";
import { DayDiscussHandler } from "./DayDiscuss";
import { ExileVoteHandler } from "./ExileVote";
import { ExileVoteCheckHandler } from "./ExileVoteCheck";
import { GuardProtectHandler } from "./GuardProtect";
import { HunterCheckHandler } from "./HunterCheck";
import { HunterShootHandler } from "./HunterShoot";
import { LeaveMsgHandler } from "./LeaveMsg";
import { SeerCheckHandler } from "./SeerCheck";
import { SheriffAssignHandler } from "./SheriffAssign";
import { SheriffElectHandler } from "./SheriffElect";
import { SheriffSpeachHandler } from "./SheriffSpeach";
import { SheriffVoteHandler } from "./SheriffVote";
import { SheriffVoteCheckHandler } from "./SheriffVoteCheck";
import { WitchActHandler } from "./WitchAct";
import { WolfKillHandler } from "./WolfKill";
import { WolfKillCheckHandler } from "./WolfKillCheck";

export interface Response<T = {}> {
  status: number;
  msg: string;
  data: T;
}

export interface GameActHandler {
  /**
   * 在状态中处理玩家发送到 http 请求(在此状态下进行的操作)
   * 在 koa 中被调用, 是在某个状态中处理玩家操作的函数\
   * 仅记录操作并返回操作结果, 多人操作则统一返回 ok
   */
  handleHttpInTheState: (
    room: Room,
    player: Player,
    target: index,
    ctx: Context
  ) => Promise<Response>;
  /**
   * 链式调用\
   * 在上一个定时器到点时调用下一个状态的结束函数
   * 1. 对于结果
   *    - 单人操作: 直接返回操作结果
   *    - 多人操作: 用 socket 通知所有玩家主动拉取操作结果, 只给身份合法的人返回结果, 其他人不做处理
   * 2. 对于下一状态
   *    - 下一状态入栈
   *    - 改变天数?
   *    - 改变玩家状态
   *    - 开启下一状态的定时器
   */
  /**
   * 在某个状态开始时调用
   * 1. 设置此状态结束的回调
   * 2. 通知玩家当前状态已经发生改变
   * 3. 通知设置天数
   */
  startOfState: (room: Room) => void;

  /**
   * 在某个状态结束时调用
   * 1. 向玩家发送此状态的结果
   * 2. 根据局势判断要转移到什么状态
   * 3. 调用下一状态的 start
   */
  endOfState: (room: Room) => void;
}

export const status2Handler: Record<GameStatus, GameActHandler> = {
  [GameStatus.DAY_DISCUSS]: DayDiscussHandler,
  [GameStatus.LEAVE_MSG]: LeaveMsgHandler,
  [GameStatus.HUNTER_CHECK]: HunterCheckHandler,
  [GameStatus.EXILE_VOTE]: ExileVoteHandler,
  [GameStatus.GUARD_PROTECT]: GuardProtectHandler,
  [GameStatus.HUNTER_SHOOT]: HunterShootHandler,
  [GameStatus.SEER_CHECK]: SeerCheckHandler,
  [GameStatus.SHERIFF_ASSIGN]: SheriffAssignHandler,
  [GameStatus.SHERIFF_ELECT]: SheriffElectHandler,
  [GameStatus.SHERIFF_SPEECH]: SheriffSpeachHandler,
  [GameStatus.SHERIFF_VOTE]: SheriffVoteHandler,
  [GameStatus.WITCH_ACT]: WitchActHandler,
  [GameStatus.WOLF_KILL]: WolfKillHandler,
  [GameStatus.EXILE_VOTE_CHECK]: ExileVoteCheckHandler,
  [GameStatus.WOLF_KILL_CHECK]: WolfKillCheckHandler,
  [GameStatus.SHERIFF_VOTE_CHECK]: SheriffVoteCheckHandler,
  [GameStatus.BEFORE_DAY_DISCUSS]: BeforeDayDiscussHandler,
};
