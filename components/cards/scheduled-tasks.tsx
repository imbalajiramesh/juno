'use client'
import { createClient } from "@/utils/supabase/client";
import { SetStateAction, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { ArrowUpRight, CalendarIcon, Plus, X } from "lucide-react";
import { randomUUID } from "crypto";
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { DatePicker } from "../ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import React from "react";

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

interface Customer {
    id: string;
    first_name: string;
    last_name: string;
}
    

const ScheduledTasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);  
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [newTask, setNewTask] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskType, setNewTaskType] = useState('Call');
    const [newTaskDate, setNewTaskDate] = useState<Date>();
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [updatedDate, setUpdatedDate] = React.useState<Date>();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const supabase = createClient();

    
      useEffect(() => {
        const fetchTasks = async () => {
          const { data, error } = await supabase
          .from('alex_tasks')
          .select()
          .eq('task_status', 'Scheduled')
          .gte('task_schedule', new Date().toISOString())
          .order('task_schedule', { ascending: false })
          .limit(3);
          
          if (error) {
            console.error('Error fetching tasks:', error);
          } else {
            setTasks(data || []);
          }
        };
        fetchTasks();
      }, []);

      useEffect(() => {
        const fetchCustomers = async () => {
          const { data, error } = await supabase
          .from('customers')
          .select('id, first_name, last_name')
          .order('first_name', { ascending: true });
          
          if (error) {
            console.error('Error fetching customers:', error);
          } else {
            setCustomers(data || []);
          }
        };
        fetchCustomers();
      }, []);

      useEffect(() => {
        const fetchCustomerName = async () => {
          const { data, error } = await supabase
          .from('customers')
          .select('first_name, last_name, id')
          .in('id', tasks.map((task) => task.task_customerId));
          
          if (error) {
            console.error('Error fetching customer name:', error);
          } else {
            tasks.forEach((task, index) => {
              const customer = data.find((customer) => customer.id === task.task_customerId);
              if (customer) {
                tasks[index].task_customerName = customer.first_name + ' ' + customer.last_name;
              }
            });
        }
        };
        fetchCustomerName();
      }, [tasks]);
      
      // Function to open modal and set the selected task
    const openModal = (task: Task | null ) => {
        setSelectedTask(task);
        setUpdatedDate(task?.task_schedule ? new Date(task.task_schedule) : undefined); // Set the current task date as the default

      };
    
      // Function to close modal
      const closeModal = () => {
        setSelectedTask(null);
      };

      const handleCreateTask = async () => {
        if (!newTask.trim() || !newTaskDate || !selectedCustomerId) {
          toast.error('Please fill in all required fields');
          return;
        }

        setIsCreating(true);
        try {
          const { data, error } = await supabase
            .from('alex_tasks')
            .insert({
              id: crypto.randomUUID(),
              task_name: newTask.trim(),
              task_description: newTaskDescription.trim() || null,
              task_type: newTaskType,
              task_schedule: newTaskDate.toISOString(),
              task_status: 'Scheduled',
              task_customerId: selectedCustomerId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          // Add the new task to the list
          const customer = customers.find(c => c.id === selectedCustomerId);
          const newTaskWithCustomer = {
            ...data,
            task_customerName: customer ? `${customer.first_name} ${customer.last_name}` : ''
          };
          
          setTasks(prev => [newTaskWithCustomer, ...prev.slice(0, 2)]); // Keep only 3 tasks
          
          // Reset form
          setNewTask('');
          setNewTaskDescription('');
          setNewTaskType('Call');
          setNewTaskDate(undefined);
          setSelectedCustomerId('');
          setShowCreateForm(false);
          
          toast.success('Task created successfully!');
        } catch (error) {
          console.error('Error creating task:', error);
          toast.error('Failed to create task');
        } finally {
          setIsCreating(false);
        }
      };

      const handleUpdateTask =  async(task: Task) => {
        try {
            if (updatedDate !== null && task.task_schedule !== updatedDate?.toISOString()) {
              // Update the task schedule in Supabase
              const { error, data } = await supabase
                .from('alex_tasks')
                .update({ task_schedule: updatedDate?.toISOString() })
                .eq('id', task.id);
        
              // Handle error if any
              if (error) {
                console.error('Error updating task:', error);
                toast.error('Failed to update task');
              } else {
                // Handle success if data is returned
                toast.success('Task updated successfully');
                closeModal();
                // Refresh tasks
                const { data: updatedTasks } = await supabase
                  .from('alex_tasks')
                  .select()
                  .eq('task_status', 'Scheduled')
                  .gte('task_schedule', new Date().toISOString())
                  .order('task_schedule', { ascending: false })
                  .limit(3);
                setTasks(updatedTasks || []);
              }
            } else {
              toast.error('No changes made');
            }
          } catch (err) {
            console.error('Unexpected error:', err);
            toast.error('An unexpected error occurred');
          }
        };
    
      const handleDeleteTask = async (taskId: string) => {
        try {
          const { error } = await supabase
            .from('alex_tasks')
            .delete()
            .eq('id', taskId);

          if (error) throw error;

          setTasks(tasks.filter(task => task.id !== taskId));
          closeModal();
          toast.success('Task deleted successfully!');
        } catch (error) {
          console.error('Error deleting task:', error);
          toast.error('Failed to delete task');
        }
      };
    
      return (
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center">
              <div className="grid gap-2">
                <CardTitle>Scheduled Tasks</CardTitle>
                <CardDescription className="hidden lg:block">
                  Tasks scheduled for the agent
                </CardDescription>
              </div>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                  variant="default"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
                <Button asChild size="sm" className="gap-1" variant={"outline"}>
                  <Link href="#">
                    View All Tasks
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
          <CardContent>
            <Table className="min-w-full">
                <TableBody>
                {tasks.length === 0 && (
                    
                      <TableRow>
                        <TableCell className="text-start text-gray-500">
                        No tasks scheduled. Let's start adding some tasks!
                        </TableCell>
                        </TableRow>
                      
                )}
                {tasks.map((task) => (
                    <TableRow key={task.id} onClick={() => openModal(task)} className="cursor-pointer hover:bg-gray-100">
                    <TableCell>{task.task_name}</TableCell>
                    <TableCell>{task.task_description || ''}</TableCell>
                    <TableCell>
                        <Badge variant="outline">{task.task_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                        {task.task_schedule ? format(new Date(task.task_schedule), "MMM dd, yyyy") : ''}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>

            {/* Create Task Modal */}
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogContent className="max-w-2xl">
                <DialogTitle>Create New Agent Task</DialogTitle>
                <DialogDescription>
                  Schedule a task for the agent to execute with a specific customer.
                </DialogDescription>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Task Name *</label>
                      <Input
                        placeholder="Enter task name..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Task Type *</label>
                      <Select value={newTaskType} onValueChange={setNewTaskType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Call">Call</SelectItem>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="Text">Text</SelectItem>
                          <SelectItem value="Follow-up">Follow-up</SelectItem>
                          <SelectItem value="Research">Research</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Task Description</label>
                    <Textarea
                      placeholder="Describe what the agent should do..."
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Customer *</label>
                      <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer..." />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.first_name} {customer.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Schedule Date *</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newTaskDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newTaskDate ? format(newTaskDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newTaskDate}
                            onSelect={setNewTaskDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTask}
                    disabled={isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Task Modal */}
            {selectedTask && (
                <Dialog open={selectedTask !== null} onOpenChange={closeModal}>
                <DialogContent>
                    <DialogTitle>{selectedTask?.task_name}</DialogTitle>
                    <DialogDescription>
                    {selectedTask?.task_description}
                    </DialogDescription>
                    <div className="grid gap-4 font-bold text-sm">
                        Customer: {selectedTask?.task_customerName}
                    </div>
                    
                    {/* Date Picker */}
                    <div className="mt-2">
                        <label className="text-sm font-medium mb-2 block">Reschedule Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[280px] justify-start text-left font-normal",
                                    !updatedDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {updatedDate ? format(updatedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={updatedDate}
                                onSelect={setUpdatedDate}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Update and Delete Buttons */}
                    <div className="mt-4 flex justify-between">
                    <Button variant="destructive" onClick={() => handleDeleteTask(selectedTask.id)}>
                        Delete
                        </Button>
                        <Button
                        variant="outline"
                        onClick={() => selectedTask && updatedDate && handleUpdateTask({ ...selectedTask})}
                        >
                        Update
                        </Button>
                        
                    </div>
                </DialogContent>
               
                </Dialog>
            )}
          </CardContent>
        </Card>
        
      );
    };

export default ScheduledTasks