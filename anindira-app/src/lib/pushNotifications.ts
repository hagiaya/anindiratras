import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from './supabase';

export const initializePushNotifications = async () => {
  try {
    const isCapacitor = (window as any).Capacitor && (window as any).Capacitor.isNative;
    if (!isCapacitor) {
      console.log('Local notifications are only available on native devices.');
      return;
    }

    let permStatus = await LocalNotifications.checkPermissions();

    if (permStatus.display === 'prompt') {
      permStatus = await LocalNotifications.requestPermissions();
    }

    if (permStatus.display !== 'granted') {
      console.warn('User denied local notification permission');
      return;
    }

    if ((window as any).Capacitor.getPlatform() === 'android') {
      try {
        await LocalNotifications.createChannel({
          id: 'high_importance_channel',
          name: 'Important Notifications',
          description: 'Notifikasi penting untuk Orderan dan Chat',
          importance: 5, // 5 = High importance (heads-up notification)
          visibility: 1,
          vibration: true,
        });
      } catch (err) {
        console.error('Error creating notification channel', err);
      }
    }

    // Prevent duplicate listeners
    if ((window as any).hasRealtimeListeners) return;
    (window as any).hasRealtimeListeners = true;

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) return;
    const userId = session.user.id;
    const role = session.user.user_metadata?.role || 'USER';

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
          
          // Show Local Notification
          await LocalNotifications.schedule({
            notifications: [
              {
                title: "Pesan Baru",
                body: newChat.message,
                id: Math.floor(Math.random() * 100000),
                schedule: { at: new Date(Date.now() + 100) },
                channelId: 'high_importance_channel',
                actionTypeId: '',
                extra: {
                  type: 'NEW_CHAT',
                  chatId: newChat.id,
                },
              },
            ],
          });
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
            
            // Show Local Notification
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: "Orderan Baru Masuk!",
                  body: `Layanan ${newOrder.order_type.replace('_', ' ')} senilai Rp ${newOrder.total_price.toLocaleString('id-ID')} tersedia.`,
                  id: Math.floor(Math.random() * 100000),
                  schedule: { at: new Date(Date.now() + 100) },
                  channelId: 'high_importance_channel',
                  actionTypeId: '',
                  extra: {
                    type: 'NEW_ORDER',
                    orderId: newOrder.id,
                  },
                },
              ],
            });
          }
        )
        .subscribe();
    }

    // Listen to local notification clicks
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      console.log('Notification clicked: ', notification.notification.extra);
      // Navigate to chat or order based on extra payload if needed
    });

  } catch (error) {
    console.error('Failed to initialize local notifications', error);
  }
};
