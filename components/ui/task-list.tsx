"use client";

import { useState } from "react";
import type { ComponentProps, CSSProperties } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

const FILL: Transition = { duration: 0.24, ease: EASE_OUT };
const POP: Transition = { duration: 0.34, ease: EASE_OUT, times: [0, 0.4, 1] };
const TICK: Transition = { duration: 0.22, ease: EASE_OUT, delay: 0.06 };
const STRIKE: Transition = { duration: 0.38, ease: EASE_IN_OUT };
const NUDGE: Transition = {
  duration: 0.3,
  ease: EASE_OUT,
  times: [0, 0.35, 0.7, 1],
};
const REORDER: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 30,
  mass: 1,
};
const INSTANT: Transition = { duration: 0 };

// the same array every render, or motion reads a new target and replays it
const POP_SCALE = [1, 1.08, 1];
const FLICK = [0, 8, -2, 0];

// the strike rides on the text itself, so a label that wraps gets a line per row
const STRIKE_STYLE: CSSProperties = {
  backgroundImage: "linear-gradient(currentColor, currentColor)",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "0 52%",
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
};

// each step waits for the one before it to report done, the row parks after all three
const STAGE = { idle: 0, tick: 1, strike: 2, nudge: 3, settled: 4 } as const;
type Stage = (typeof STAGE)[keyof typeof STAGE];

const ACCENT = "bg-[#FF5F2E]";
const SURFACE = "bg-white dark:bg-[#1F1F1F]";
const LIFT =
  "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_3px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_3px_10px_rgba(0,0,0,0.3)]";
const HOVER =
  "hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_18px_rgba(0,0,0,0.09)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.45),0_6px_18px_rgba(0,0,0,0.4)]";
const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F2E] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
const MUTED = "text-neutral-400 dark:text-neutral-500";

function useTiming() {
  const reduced = useReducedMotion() ?? false;
  return (transition: Transition) => (reduced ? INSTANT : transition);
}

function TaskCheck({ done, onDrawn }: { done: boolean; onDrawn: () => void }) {
  const timing = useTiming();

  return (
    <motion.span
      aria-hidden
      className="relative grid h-6 w-6 shrink-0 place-items-center"
      initial={false}
      animate={{ scale: done ? POP_SCALE : 1 }}
      transition={done ? timing(POP) : INSTANT}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full border-2 transition-colors duration-200 ease-out",
          done
            ? "border-[#FF5F2E]"
            : "border-neutral-200 dark:border-neutral-700",
        )}
      />
      <motion.span
        className={cn("absolute inset-0 rounded-full", ACCENT)}
        initial={false}
        animate={{ scale: done ? 1 : 0 }}
        transition={timing(FILL)}
      />
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative"
        aria-hidden
      >
        <motion.path
          d="M4 12.5 9.5 18 20 7"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={timing(TICK)}
          onAnimationComplete={onDrawn}
        />
      </svg>
    </motion.span>
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
        className={cn(
          "text-[15px] font-medium leading-6 tracking-[-0.01em] transition-colors duration-300",
          struck ? MUTED : "text-neutral-800 dark:text-neutral-100",
        )}
        style={STRIKE_STYLE}
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

type MotionSafeProps = Omit<
  ComponentProps<"button">,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
>;

export type TaskItemProps = MotionSafeProps & {
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

  // restart the sequence in the same render the tick flips, so it never paints stale
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
        SURFACE,
        LIFT,
        HOVER,
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

  const park = (id: string) =>
    setParked((ids) => (ids.includes(id) ? ids : [...ids, id]));

  const toggle = (id: string, done: boolean) => {
    const next = current.map((task) =>
      task.id === id ? { ...task, done } : task,
    );
    if (tasks === undefined) setOwn(next);
    onTasksChange?.(next);
    // unticking pulls the row back up at once, ticking waits for the row to finish
    if (!done) setParked((ids) => ids.filter((parkedId) => parkedId !== id));
  };

  // a parked row that is no longer done, or gone entirely, was changed from outside
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
            onSettled={() => park(task.id)}
          />
        </motion.li>
      ))}
    </ul>
  );
}

export default TaskList;
