"use client";

import { useState } from "react";
import type { ComponentProps, CSSProperties } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

const POP_SCALE = [1, 1.08, 1];
const FLICK = [0, 8, -2, 0];
const FLICK_TIMES = [0, 0.35, 0.7, 1];

const FILL: Transition = { duration: 0.24, ease: EASE_OUT };
const POP: Transition = { duration: 0.34, ease: EASE_OUT, times: [0, 0.4, 1] };
const TICK: Transition = { duration: 0.22, ease: EASE_OUT, delay: 0.06 };
const STRIKE: Transition = { duration: 0.38, ease: EASE_IN_OUT };
const NUDGE: Transition = { duration: 0.3, ease: EASE_OUT, times: FLICK_TIMES };
const REORDER: Transition = { type: "spring", stiffness: 320, damping: 30 };
const INSTANT: Transition = { duration: 0 };

// dashes divide the circumference, so the ring closes without a seam
const RING_R = 11;
const RING_DASH = `1 ${(2 * Math.PI * RING_R) / 13 - 1}`;

// the strike rides on the text itself, so a label that wraps gets a line per row
const STRIKE_STYLE: CSSProperties = {
  backgroundImage: "linear-gradient(currentColor, currentColor)",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "0 52%",
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
};

// each step waits for the one before it, the row parks only after all three
const STAGE = { idle: 0, tick: 1, strike: 2, nudge: 3, settled: 4 } as const;
type Stage = (typeof STAGE)[keyof typeof STAGE];

const CARD =
  "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_3px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_18px_rgba(0,0,0,0.09)] dark:bg-[#1F1F1F] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_3px_10px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.45),0_6px_18px_rgba(0,0,0,0.4)]";
const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F2E] focus-visible:ring-offset-2";

function useTiming() {
  const reduced = useReducedMotion() ?? false;
  return (transition: Transition) => (reduced ? INSTANT : transition);
}

function TaskCheck({ done, onDrawn }: { done: boolean; onDrawn: () => void }) {
  const timing = useTiming();

  return (
    <motion.svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-6 w-6 shrink-0 text-neutral-300 dark:text-neutral-600"
      initial={false}
      animate={{ scale: done ? POP_SCALE : 1 }}
      transition={done ? timing(POP) : INSTANT}
    >
      <motion.circle
        cx="12"
        cy="12"
        r={RING_R}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={RING_DASH}
        initial={false}
        animate={{ opacity: done ? 0 : 1 }}
        transition={timing(FILL)}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="12"
        fill="#FF5F2E"
        style={{ transformBox: "view-box", transformOrigin: "12px 12px" }}
        initial={false}
        animate={{ scale: done ? 1 : 0 }}
        transition={timing(FILL)}
      />
      <motion.path
        d="M7.4 12.4 10.6 15.5 16.6 8.9"
        fill="none"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
        transition={timing(TICK)}
        onAnimationComplete={onDrawn}
      />
    </motion.svg>
  );
}

function TaskLabel({
  label,
  struck,
  onStruck,
}: {
  label: string;
  struck: boolean;
  onStruck: () => void;
}) {
  const timing = useTiming();

  return (
    <span className="min-w-0 flex-1">
      <motion.span
        style={STRIKE_STYLE}
        className={cn(
          "text-[15px] font-medium leading-6 tracking-[-0.01em] transition-colors duration-300",
          struck
            ? "text-neutral-400 dark:text-neutral-500"
            : "text-neutral-800 dark:text-neutral-100",
        )}
        initial={false}
        animate={{ backgroundSize: struck ? "100% 2px" : "0% 2px" }}
        transition={timing(STRIKE)}
        onAnimationComplete={onStruck}
      >
        {label}
      </motion.span>
    </span>
  );
}

export type TaskItemProps = Omit<
  ComponentProps<"button">,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
> & {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onSettled?: () => void;
};

export function TaskItem({
  label,
  checked,
  defaultChecked = false,
  onCheckedChange,
  onSettled,
  className,
  onClick,
  ...props
}: TaskItemProps) {
  const timing = useTiming();
  const [own, setOwn] = useState(defaultChecked);
  const done = checked ?? own;

  const [stage, setStage] = useState<Stage>(done ? STAGE.settled : STAGE.idle);
  const [was, setWas] = useState(done);

  // restart in the same render the tick flips, so the row never paints stale
  if (was !== done) {
    setWas(done);
    setStage(done ? STAGE.tick : STAGE.idle);
  }

  const advance = (from: Stage, to: Stage) => {
    if (!done || stage !== from) return;
    setStage(to);
    if (to === STAGE.settled) onSettled?.();
  };

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={done}
      data-slot="task-item"
      data-state={done ? "checked" : "unchecked"}
      onClick={(event) => {
        onClick?.(event);
        if (checked === undefined) setOwn(!done);
        onCheckedChange?.(!done);
      }}
      animate={{ x: stage === STAGE.nudge ? FLICK : 0 }}
      transition={stage === STAGE.nudge ? timing(NUDGE) : INSTANT}
      onAnimationComplete={() => advance(STAGE.nudge, STAGE.settled)}
      className={cn(
        "flex w-fit max-w-full cursor-pointer items-start gap-3 rounded-[14px] px-3.5 py-2.5 text-left transition-shadow duration-300",
        CARD,
        FOCUS,
        className,
      )}
      {...props}
    >
      <TaskCheck
        done={done}
        onDrawn={() => advance(STAGE.tick, STAGE.strike)}
      />
      <TaskLabel
        label={label}
        struck={stage >= STAGE.strike}
        onStruck={() => advance(STAGE.strike, STAGE.nudge)}
      />
    </motion.button>
  );
}

export type Task = {
  id: string;
  label: string;
  done?: boolean;
};

export type TaskListProps = ComponentProps<"ul"> & {
  tasks?: Task[];
  defaultTasks?: Task[];
  onTasksChange?: (tasks: Task[]) => void;
};

export function TaskList({
  tasks,
  defaultTasks = [],
  onTasksChange,
  className,
  ...props
}: TaskListProps) {
  const timing = useTiming();
  const [own, setOwn] = useState(defaultTasks);
  const current = tasks ?? own;

  const [parked, setParked] = useState<string[]>(() =>
    (tasks ?? defaultTasks).filter((task) => task.done).map((task) => task.id),
  );

  const toggle = (id: string, done: boolean) => {
    const next = current.map((task) =>
      task.id === id ? { ...task, done } : task,
    );
    if (tasks === undefined) setOwn(next);
    onTasksChange?.(next);
    // unticking pulls the row back up at once, ticking waits for the row
    if (!done) setParked((ids) => ids.filter((parkedId) => parkedId !== id));
  };

  // a parked row that is no longer done, or gone, was changed from outside
  const finished = parked
    .map((id) => current.find((task) => task.id === id))
    .filter((task): task is Task => task?.done === true);
  const open = current.filter((task) => !finished.includes(task));

  return (
    <ul
      data-slot="task-list"
      className={cn(
        "flex w-fit max-w-full flex-col items-start gap-2",
        className,
      )}
      {...props}
    >
      {[...open, ...finished].map((task) => (
        <motion.li
          key={task.id}
          layout
          transition={timing(REORDER)}
          className="max-w-full"
        >
          <TaskItem
            label={task.label}
            checked={!!task.done}
            onCheckedChange={(done) => toggle(task.id, done)}
            onSettled={() =>
              setParked((ids) =>
                ids.includes(task.id) ? ids : [...ids, task.id],
              )
            }
          />
        </motion.li>
      ))}
    </ul>
  );
}

export default TaskList;
