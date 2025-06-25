"use client";
import { useEffect, useState } from "react";
import { CardStack } from "../ui/card-stack";
import { createClient } from "@/utils/supabase/client";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

interface Task {
  id: string;
  task_name: string;
  task_description: string | null;
  task_type: string;
  task_schedule: string | null;
  task_status: string;
  task_customerId: string | null;
  task_customerName: string;
}

const LiveAction = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        // Fetch tasks
        const { data: taskData, error: taskError } = await supabase
          .from('alex_tasks')
          .select()
          .eq('task_status', 'In Progress')
          .order('task_schedule', { ascending: false })
          .limit(5);

        if (taskError) {
          console.error('Error fetching tasks:', taskError);
          return;
        }

        if (!taskData || taskData.length === 0) {
          setTasks([]);
          setIsLoading(false);
          return;
        }

        // Fetch customer data
        const customerIds = taskData.map((task) => task.task_customerId);
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('first_name, last_name, id')
          .in('id', customerIds);

        if (customerError) {
          console.error('Error fetching customer names:', customerError);
          return;
        }

        // Combine task and customer data
        const updatedTasks = taskData.map((task) => {
          const customer = customerData?.find((c) => c.id === task.task_customerId);
          return {
            ...task,
            task_customerName: customer
              ? `${customer.first_name} ${customer.last_name}`
              : '',
          };
        });

        setTasks(updatedTasks);
      } catch (error) {
        console.error('Error in data fetching:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []); // Empty dependency array means this effect runs once on mount

  if (isLoading) {
    return (
      <Card className="w-full items-center p-8 justify-center">
        <Skeleton className="h-[125px] rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-[250px] m-4" />
          <Skeleton className="h-4 w-[200px] m-4" />
        </div>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="w-full items-center p-8 justify-center">
        <p>No tasks in progress</p>
      </Card>
    );
  }

  return (
    <div className="m-4 flex items-center justify-center w-full">
      <CardStack items={tasks} />
    </div>
  );
};

export default LiveAction;