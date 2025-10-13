import { Vec2 } from "./Vec2";

export type TVec2Args = [number, number] | [Vec2]

export function readVec2(args: TVec2Args): Vec2 {
  if (args.length === 2) {
    return new Vec2(args[0], args[1]);
  }

  return args[0];
}
