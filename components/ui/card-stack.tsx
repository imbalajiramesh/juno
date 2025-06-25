"use client";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface Task {
    id: string;
    task_name: string;
    task_description: string | null;
    task_type: string;
    task_schedule: string | null;
    task_status: string;
    task_customerId: string | null;
    task_customerName?: string;
  }
export const CardStack = ({
  items,
  offset,
  scaleFactor,
}: {
  items: Task[];
  offset?: number;
  scaleFactor?: number;
}) => {
  const CARD_OFFSET = offset || 10;
  const SCALE_FACTOR = scaleFactor || 0.06;
  const [tasks, setTasks] = useState<Task[]>(items);
  const intervalRef = useRef<NodeJS.Timeout>();

  const startFlipping = () => {
    intervalRef.current = setInterval(() => {
      setTasks((prevCards: Task[]) => {
        const newArray = [...prevCards];
        newArray.unshift(newArray.pop()!);
        return newArray;
      });
    }, 5000);
  };

  useEffect(() => {
    startFlipping();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="relative h-60 w-60 md:h-60 md:w-full p-0">
      {tasks.map((task, index) => {
        return (
          <motion.div
            key={task.id}
            className="absolute dark:bg-black bg-white h-60 w-60 md:h-60 md:w-full rounded-xl p-4 shadow-xl border border-neutral-200 dark:border-white/[0.1]  shadow-black/[0.1] dark:shadow-white/[0.05] flex flex-col justify-center items-left"
            style={{
              transformOrigin: "top center",
            }}
            animate={{
              top: index * -CARD_OFFSET,
              scale: 1 - index * SCALE_FACTOR, // decrease scale for cards that are behind
              zIndex: tasks.length - index, //  decrease z-index for the cards that are behind
            }}
          >
            
            <div className="flex flex-col space-y-2">
            {task.task_type === "Email" && (
              <Image src="/gifs/email.gif" alt="Alex" width={64} height={64} />
            )}
            {task.task_type === "Text" && (
              <Image src="/gifs/text.gif" alt="Alex" width={64} height={64} />
            )}
            {task.task_type === "Call" && (
              <Image src="/gifs/call.gif" alt="Alex" width={64} height={64} />
            )}
              <p className=" font-medium ">
                {task.task_customerName || "Unknown Customer"}
              </p>
              <p className="font-normal">
                {task.task_name}
              </p>
            </div>
            <div className="font-normal">
              {task.task_description || ''}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
