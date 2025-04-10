
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import StrikethroughInput from './StrikethroughInput';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          title: "Ошибка входа",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (data.user) {
        toast({
          title: "Вход выполнен",
          description: "Добро пожаловать!"
        });
        // Redirect based on user role or to a default page
        navigate('/dashboard');
      }
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Произошла неизвестная ошибка",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-white">ЛКПО</h1>
        <p className="text-muted-foreground">Личный кабинет правообладателя</p>
      </div>
      
      <div className="space-y-4">
        <StrikethroughInput 
          id="username" 
          label="Почта" 
          placeholder="Введите вашу электронную почту" 
          disabled={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <StrikethroughInput 
          id="password" 
          label="Пароль" 
          type="password" 
          placeholder="Введите ваш пароль" 
          disabled={false}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      
      <div className="pt-4">
        <p className="text-sm text-white/80 mb-6 leading-relaxed">
          ЛКПО на данный момент работает в тестовом режиме...
        </p>
        
        <div className="space-y-3">
          <Button 
            className="w-full bg-black hover:bg-gray-900 text-white border border-white/20"
            onClick={handleLogin}
          >
            Войти
          </Button>
          
          <Button 
            variant="outline"
            className="w-full bg-white hover:bg-white/90 text-black border-white"
            onClick={() => window.open('https://geek-records.com/', '_blank')}
          >
            Вернуться на сайт
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
