"use client";

import { TaskList } from "@/components/ui/task-list";

const TASKS = [
  { id: "testing", label: "Organize a user testing session", done: true },
  { id: "designs", label: "Prepare designs for client review" },
  { id: "meditation", label: "15-minute meditation" },
];

export default function TaskListPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <TaskList defaultTasks={TASKS} />
    </div>
  );
}
