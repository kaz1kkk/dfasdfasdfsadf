
import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Home, Inbox, LogOut, User, Settings } from "lucide-react";

// Define the ticket priority and status types
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

type Ticket = {
  id: string;
  subject: string;
  content: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  user_id: string;
  user_email?: string;
};

type TicketFormValues = {
  subject: string;
  content: string;
  priority: TicketPriority;
};

type TicketResponse = {
  id: string;
  content: string;
  created_at: string;
  responder_id: string;
  responder_email?: string;
  responder_role?: string;
  ticket_id: string;
  profiles?: {
    email?: string;
    role?: string;
  };
};

type TicketResponseFormValues = {
  content: string;
};

type TicketStatusUpdateFormValues = {
  status: TicketStatus;
};

const Dashboard = () => {
  const [profile, setProfile] = useState<{ email: string; role: string; id: string } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketResponses, setTicketResponses] = useState<TicketResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponsesLoading, setIsResponsesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("tickets");
  const [activeMenuItem, setActiveMenuItem] = useState("tickets");
  const navigate = useNavigate();

  const form = useForm<TicketFormValues>({
    defaultValues: {
      subject: '',
      content: '',
      priority: 'medium',
    },
  });

  const responseForm = useForm<TicketResponseFormValues>({
    defaultValues: {
      content: '',
    },
  });

  const statusForm = useForm<TicketStatusUpdateFormValues>({
    defaultValues: {
      status: 'open',
    },
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('email, role, id')
        .eq('id', session.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      setProfile(data);
      fetchTickets(data.role, session.user.id);
    };

    fetchUserProfile();
  }, [navigate]);

  const fetchTickets = async (role: string, userId: string) => {
    setIsLoading(true);
    try {
      if (role === 'admin') {
        // Admin can see all tickets with user email
        const { data, error } = await supabase
          .from('tickets')
          .select(`
            *,
            profiles(email)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Format data to include user_email
        const formattedTickets = data.map(ticket => ({
          ...ticket,
          user_email: ticket.profiles?.email
        }));
        
        setTickets(formattedTickets);
      } else {
        // Regular users can only see their own tickets
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Ошибка загрузки тикетов",
        description: "Не удалось загрузить тикеты. Пожалуйста, попробуйте позже.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTicketResponses = async (ticketId: string) => {
    setIsResponsesLoading(true);
    try {
      const { data, error } = await supabase
        .from('ticket_responses')
        .select(`
          *,
          profiles(email, role)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Format data to include responder_email and role
      const formattedResponses = data.map(response => ({
        ...response,
        responder_email: response.profiles?.email,
        responder_role: response.profiles?.role
      }));
      
      setTicketResponses(formattedResponses);
    } catch (error) {
      console.error('Error fetching ticket responses:', error);
      toast({
        title: "Ошибка загрузки ответов",
        description: "Не удалось загрузить ответы на тикет. Пожалуйста, попробуйте позже.",
        variant: "destructive"
      });
    } finally {
      setIsResponsesLoading(false);
    }
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    statusForm.setValue('status', ticket.status);
    fetchTicketResponses(ticket.id);
  };

  const handleBackToTickets = () => {
    setSelectedTicket(null);
    setTicketResponses([]);
    responseForm.reset();
  };

  const handleMenuItemClick = (item: string) => {
    setActiveMenuItem(item);
    if (item === 'tickets') {
      setSelectedTicket(null);
    }
  };

  const handleProfileView = () => {
    // In the future this can navigate to a profile page
    toast({
      title: "Профиль",
      description: `${profile?.email} - ${profile?.role === 'admin' ? 'Администратор' : 'Пользователь'}`
    });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: "Ошибка выхода",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Выход выполнен",
      description: "До свидания!"
    });
    
    navigate('/');
  };

  const onSubmitTicket = async (values: TicketFormValues) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Ошибка авторизации",
          description: "Пожалуйста, войдите в систему",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('tickets')
        .insert({
          subject: values.subject,
          content: values.content,
          priority: values.priority,
          user_id: session.user.id
        });

      if (error) throw error;

      toast({
        title: "Тикет отправлен",
        description: "Ваш тикет был успешно отправлен"
      });

      form.reset();
      
      // Refresh tickets
      fetchTickets(profile?.role || 'user', session.user.id);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({
        title: "Ошибка отправки тикета",
        description: "Не удалось отправить тикет. Пожалуйста, попробуйте позже.",
        variant: "destructive"
      });
    }
  };

  const onSubmitResponse = async (values: TicketResponseFormValues) => {
    try {
      if (!selectedTicket) return;
      if (!profile) return;

      // Check if ticket is closed
      if (selectedTicket.status === 'closed' && profile.role !== 'admin') {
        toast({
          title: "Тикет закрыт",
          description: "Нельзя отправлять ответы на закрытый тикет",
          variant: "destructive"
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Ошибка авторизации",
          description: "Пожалуйста, войдите в систему",
          variant: "destructive"
        });
        return;
      }

      console.log("Submitting response with user ID:", profile.id);
      
      const { error } = await supabase
        .from('ticket_responses')
        .insert({
          content: values.content,
          ticket_id: selectedTicket.id,
          responder_id: profile.id
        });

      if (error) {
        console.error('Error submitting response:', error);
        throw error;
      }

      toast({
        title: "Ответ отправлен",
        description: "Ваш ответ был успешно отправлен"
      });

      responseForm.reset();
      
      // Refresh responses
      fetchTicketResponses(selectedTicket.id);
    } catch (error: any) {
      console.error('Error submitting response:', error);
      toast({
        title: "Ошибка отправки ответа",
        description: error.message || "Не удалось отправить ответ. Пожалуйста, попробуйте позже.",
        variant: "destructive"
      });
    }
  };

  const onUpdateTicketStatus = async (values: TicketStatusUpdateFormValues) => {
    try {
      if (!selectedTicket) return;
      
      // Only allow admins to update status
      if (profile?.role !== 'admin') {
        toast({
          title: "Доступ запрещен",
          description: "Только администраторы могут изменять статус тикета.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('tickets')
        .update({
          status: values.status
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      toast({
        title: "Статус обновлен",
        description: "Статус тикета был успешно обновлен"
      });
      
      // Update local ticket data
      setSelectedTicket(prev => prev ? { ...prev, status: values.status } : null);
      
      // Refresh ticket list after status update
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchTickets(profile?.role || 'user', session.user.id);
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Ошибка обновления статуса",
        description: "Не удалось обновить статус тикета. Пожалуйста, попробуйте позже.",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return '';
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Render ticket detail view
  const renderTicketDetail = () => {
    if (!selectedTicket) return null;

    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleBackToTickets}
            className="border-white/20 hover:bg-white/10"
          >
            ← Назад к списку
          </Button>
          
          <h2 className="text-2xl font-bold ml-2">{selectedTicket.subject}</h2>
        </div>
        
        <Card className="border border-white/10 bg-black">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                Информация о тикете
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                  {selectedTicket.priority === 'low' && 'Низкий'}
                  {selectedTicket.priority === 'medium' && 'Средний'}
                  {selectedTicket.priority === 'high' && 'Высокий'} 
                  {selectedTicket.priority === 'critical' && 'Критический'}
                </span>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                {selectedTicket.status === 'open' && 'Открыт'}
                {selectedTicket.status === 'in_progress' && 'В работе'}
                {selectedTicket.status === 'resolved' && 'Решен'} 
                {selectedTicket.status === 'closed' && 'Закрыт'}
              </span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              {selectedTicket.user_email && <span>От: {selectedTicket.user_email} • </span>}
              Создан: {formatDate(selectedTicket.created_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 mb-6">
              <p className="whitespace-pre-wrap">{selectedTicket.content}</p>
            </div>
            
            {/* Status update form - Only visible to admins */}
            {profile?.role === 'admin' && (
              <div className="mb-6">
                <Form {...statusForm}>
                  <form onSubmit={statusForm.handleSubmit(onUpdateTicketStatus)} className="flex items-end gap-4">
                    <FormField
                      control={statusForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-gray-300">Изменить статус</FormLabel>
                          <FormControl>
                            <select
                              className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                              {...field}
                            >
                              <option value="open" className="bg-black">Открыт</option>
                              <option value="in_progress" className="bg-black">В работе</option>
                              <option value="resolved" className="bg-black">Решен</option>
                              <option value="closed" className="bg-black">Закрыт</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="bg-white text-black hover:bg-gray-200"
                    >
                      Обновить статус
                    </Button>
                  </form>
                </Form>
              </div>
            )}
            
            <h3 className="text-xl font-medium mb-4">Ответы</h3>
            
            {isResponsesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-pulse text-gray-400">Загрузка ответов...</div>
              </div>
            ) : ticketResponses.length > 0 ? (
              <div className="space-y-4">
                {ticketResponses.map((response) => (
                  <div key={response.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-blue-400">
                        {response.responder_email || 'Пользователь'}
                        {response.responder_role === 'admin' && 
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Администратор
                          </span>
                        }
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(response.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{response.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                Пока нет ответов на этот тикет
              </div>
            )}
            
            {/* Response form - don't show if ticket is closed for regular users */}
            {(selectedTicket.status !== 'closed' || profile?.role === 'admin') && (
              <div className="mt-6">
                <Form {...responseForm}>
                  <form onSubmit={responseForm.handleSubmit(onSubmitResponse)} className="space-y-4">
                    <FormField
                      control={responseForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Ваш ответ</FormLabel>
                          <FormControl>
                            <Textarea
                              className="min-h-[120px] border-white/10 bg-black placeholder:text-gray-500 focus:border-white/20 focus:ring-white/20"
                              placeholder="Напишите ваш ответ здесь..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-white text-black hover:bg-gray-200"
                    >
                      Отправить ответ
                    </Button>
                  </form>
                </Form>
              </div>
            )}
            {/* Show message if ticket is closed for regular users */}
            {selectedTicket.status === 'closed' && profile?.role !== 'admin' && (
              <div className="mt-6 p-4 bg-red-100/10 border border-red-200/20 rounded-lg text-center text-red-300">
                Этот тикет закрыт. Вы не можете добавлять новые ответы.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Create a new sidebar layout
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="w-64 border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-4 h-16 border-b border-white/10 flex items-center">
            <h1 className="text-2xl font-bold text-white">
              Geek Records
            </h1>
          </div>
          
          {/* Menu items */}
          <div className="flex-1 p-4">
            <div className="space-y-2">
              <button 
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${activeMenuItem === 'tickets' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                onClick={() => handleMenuItemClick('tickets')}
              >
                <Inbox className="h-5 w-5" />
                <span>Тикеты</span>
              </button>
              
              <button 
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${activeMenuItem === 'profile' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                onClick={() => {
                  handleMenuItemClick('profile');
                  handleProfileView();
                }}
              >
                <User className="h-5 w-5" />
                <span>Профиль</span>
              </button>
              
              <button 
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${activeMenuItem === 'settings' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                onClick={() => handleMenuItemClick('settings')}
              >
                <Settings className="h-5 w-5" />
                <span>Настройки</span>
              </button>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <button 
              className="w-full px-4 py-2 border border-white/20 rounded-lg flex items-center gap-2 hover:bg-white/5"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span>Выйти</span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="text-gray-400">
                {profile?.email} • 
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile?.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {profile?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </span>
              </p>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 p-6 overflow-auto">
            {selectedTicket ? renderTicketDetail() : (
              <Tabs defaultValue="tickets" className="w-full">
                <TabsList className="mb-8 bg-black border border-white/10">
                  <TabsTrigger value="tickets" className="data-[state=active]:bg-white/10">
                    Тикеты
                  </TabsTrigger>
                  {profile?.role !== 'admin' && (
                    <TabsTrigger value="newTicket" className="data-[state=active]:bg-white/10">
                      Создать тикет
                    </TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="tickets">
                  {profile?.role === 'admin' ? (
                    <Card className="border border-white/10 bg-black">
                      <CardHeader>
                        <CardTitle className="text-xl text-white">Управление тикетами</CardTitle>
                        <CardDescription className="text-gray-400">
                          Просмотр всех тикетов пользователей
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-pulse text-gray-400">Загрузка тикетов...</div>
                          </div>
                        ) : tickets.length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="border-white/10 hover:bg-white/5">
                                  <TableHead className="text-white">Тема</TableHead>
                                  <TableHead className="text-white">Пользователь</TableHead>
                                  <TableHead className="text-white">Приоритет</TableHead>
                                  <TableHead className="text-white">Статус</TableHead>
                                  <TableHead className="text-white">Дата создания</TableHead>
                                  <TableHead className="text-white">Действия</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tickets.map((ticket) => (
                                  <TableRow key={ticket.id} className="border-white/10 hover:bg-white/5">
                                    <TableCell className="font-medium">{ticket.subject}</TableCell>
                                    <TableCell>{ticket.user_email}</TableCell>
                                    <TableCell>
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority === 'low' && 'Низкий'}
                                        {ticket.priority === 'medium' && 'Средний'}
                                        {ticket.priority === 'high' && 'Высокий'} 
                                        {ticket.priority === 'critical' && 'Критический'}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                        {ticket.status === 'open' && 'Открыт'}
                                        {ticket.status === 'in_progress' && 'В работе'}
                                        {ticket.status === 'resolved' && 'Решен'} 
                                        {ticket.status === 'closed' && 'Закрыт'}
                                      </span>
                                    </TableCell>
                                    <TableCell>{formatDate(ticket.created_at)}</TableCell>
                                    <TableCell>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-white/20 hover:bg-white/10"
                                        onClick={() => handleViewTicket(ticket)}
                                      >
                                        Просмотр
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            Нет тикетов для отображения
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border border-white/10 bg-black">
                      <CardHeader>
                        <CardTitle className="text-xl text-white">Мои тикеты</CardTitle>
                        <CardDescription className="text-gray-400">
                          История отправленных вами тикетов
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-pulse text-gray-400">Загрузка тикетов...</div>
                          </div>
                        ) : tickets.length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="border-white/10 hover:bg-white/5">
                                  <TableHead className="text-white">Тема</TableHead>
                                  <TableHead className="text-white">Приоритет</TableHead>
                                  <TableHead className="text-white">Статус</TableHead>
                                  <TableHead className="text-white">Дата</TableHead>
                                  <TableHead className="text-white">Действия</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tickets.map((ticket) => (
                                  <TableRow key={ticket.id} className="border-white/10 hover:bg-white/5">
                                    <TableCell className="font-medium">{ticket.subject}</TableCell>
                                    <TableCell>
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority === 'low' && 'Низкий'}
                                        {ticket.priority === 'medium' && 'Средний'}
                                        {ticket.priority === 'high' && 'Высокий'} 
                                        {ticket.priority === 'critical' && 'Критический'}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                        {ticket.status === 'open' && 'Открыт'}
                                        {ticket.status === 'in_progress' && 'В работе'}
                                        {ticket.status === 'resolved' && 'Решен'} 
                                        {ticket.status === 'closed' && 'Закрыт'}
                                      </span>
                                    </TableCell>
                                    <TableCell>{formatDate(ticket.created_at)}</TableCell>
                                    <TableCell>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-white/20 hover:bg-white/10"
                                        onClick={() => handleViewTicket(ticket)}
                                      >
                                        Просмотр
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            У вас еще нет тикетов
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                {profile?.role !== 'admin' && (
                  <TabsContent value="newTicket">
                    <Card className="border border-white/10 bg-black">
                      <CardHeader>
                        <CardTitle className="text-xl text-white">Отправить тикет</CardTitle>
                        <CardDescription className="text-gray-400">
                          Создайте новый тикет в службу поддержки
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmitTicket)} className="space-y-4">
                            <FormField
                              control={form.control}
                              name="subject"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-300">Тема</FormLabel>
                                  <FormControl>
                                    <input
                                      className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                                      placeholder="Введите тему тикета"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="content"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-300">Сообщение</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      className="min-h-[120px] border-white/10 bg-black placeholder:text-gray-500 focus:border-white/20 focus:ring-white/20"
                                      placeholder="Опишите вашу проблему"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="priority"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-300">Приоритет</FormLabel>
                                  <FormControl>
                                    <select
                                      className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                      {...field}
                                    >
                                      <option value="low" className="bg-black">Низкий</option>
                                      <option value="medium" className="bg-black">Средний</option>
                                      <option value="high" className="bg-black">Высокий</option>
                                      <option value="critical" className="bg-black">Критический</option>
                                    </select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <Button 
                              type="submit" 
                              className="w-full bg-white text-black hover:bg-gray-200"
                            >
                              Отправить тикет
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </main>
          
          {/* Footer with tabs */}
          <footer className="h-16 border-t border-white/10 flex justify-center items-center">
            <div className="flex space-x-4">
              <button 
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeMenuItem === 'tickets' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                onClick={() => handleMenuItemClick('tickets')}
              >
                <Inbox className="h-5 w-5" />
                <span>Тикеты</span>
              </button>
              
              <button 
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeMenuItem === 'profile' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                onClick={() => {
                  handleMenuItemClick('profile');
                  handleProfileView();
                }}
              >
                <User className="h-5 w-5" />
                <span>Профиль</span>
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
