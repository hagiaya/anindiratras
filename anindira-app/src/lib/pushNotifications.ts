import { supabase } from './supabase';

export const initializePushNotifications = async () => {
  try {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }

    // Request permission
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn('User denied local notification permission');
        return;
      }
    }

    if (Notification.permission !== "granted") {
      console.warn('Notification permission not granted');
      return;
    }

    // Prevent duplicate listeners
    if ((window as any).hasRealtimeListeners) return;
    (window as any).hasRealtimeListeners = true;

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) return;
    const userId = session.user.id;
    const role = session.user.user_metadata?.role || 'USER';

    const playSound = () => {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Auto-play prevented', e));
      } catch (e) {
        console.log('Audio error', e);
      }
    };

    const showNotification = (title: string, body: string, urlPath?: string) => {
      playSound();
      
      const notification = new Notification(title, {
        body,
        icon: '/favicon.svg'
      });

      notification.onclick = () => {
        window.focus();
        if (urlPath) {
          window.location.href = urlPath;
        }
        notification.close();
      };
    };

    // 1. Subscribe to new Chats (where receiver_id == my_id)
    supabase
      .channel('public:chats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload: any) => {
          const newChat = payload.new;
          showNotification("Pesan Baru", newChat.message, `/chat/${newChat.room_id || ''}`);
        }
      )
      .subscribe();

    // 2. Subscribe to new Orders (only if DRIVER)
    if (role === 'DRIVER') {
      supabase
        .channel('public:orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `status=eq.PENDING`,
          },
          async (payload: any) => {
            const newOrder = payload.new;
            const body = `Layanan ${newOrder.order_type.replace('_', ' ')} senilai Rp ${newOrder.total_price.toLocaleString('id-ID')} tersedia.`;
            showNotification("Orderan Baru Masuk!", body, '/driver');
          }
        )
        .subscribe();
    }

  } catch (error) {
    console.error('Failed to initialize local notifications', error);
  }
};
