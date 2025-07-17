  // src/components/AuthCallbackPage.tsx
  import { useEffect, useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { supabase } from '../lib/supabase';
  import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
  import { toast } from 'react-hot-toast';

  interface PublicUser {
    id: string;
    user_type?: string;
    status?: string;
  }

  export function AuthCallbackPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
      const authenticateUser = async () => {
        try {
          setStatus('loading');
          const queryParams = new URLSearchParams(window.location.search);
          const code = queryParams.get('code');

          if (!code) {
            throw new Error('Authentication code not found in URL');
          }

          // Step 1: Exchange code for session
          const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
          if (authError) throw authError;

          // Step 2: Get user data with retry logic
          let retries = 0;
          let userVerified = false;
          
          while (retries < 3 && !userVerified) {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error) throw error;
            if (!user) {
              retries++;
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }

            // Step 3: Verify user exists in public.users table
            const { data: publicUserData, error: dbError } = await supabase
              .from('users')
              .select('id, user_type, status')
              .eq('id', user.id)
              .single();

            if (dbError) {
              // If columns don't exist, fallback to auth user metadata
              if (dbError.message.includes('column') && dbError.message.includes('does not exist')) {
                console.warn('Missing columns in users table:', dbError.message);
                userVerified = true;
                setStatus('success');
                const userType = user.user_metadata?.user_type || 'volunteer';
                handleRedirection(userType, 'active');
                break;
              }
              throw dbError;
            }

            if (!publicUserData) {
              retries++;
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }

            userVerified = true;
            setStatus('success');
            
            // Step 4: Handle redirection with proper type checking
            const publicUser = publicUserData as Partial<PublicUser>;
            const userType = publicUser.user_type || user.user_metadata?.user_type || 'volunteer';
            const userStatus = publicUser.status || 'active';
            handleRedirection(userType, userStatus);
          }

          if (!userVerified) {
            throw new Error('User verification timed out. Please try logging in again.');
          }

        } catch (error) {
          console.error('Authentication error:', error);
          setStatus('error');
          setErrorMessage(
            error instanceof Error ? error.message : 'An unknown error occurred during login'
          );
          toast.error('Login failed');
          setTimeout(() => navigate('/login'), 3000);
        }
      };

      const handleRedirection = (userType: string, userStatus: string) => {
        if (userType === 'ngo') {
          if (userStatus === 'pending') {
            toast.success('Your NGO application is under review');
            navigate('/pending-approval', { replace: true });
          } else {
            navigate('/ngo-dashboard', { replace: true });
          }
        } else {
          navigate('/', { replace: true });
        }
      };

      authenticateUser();
    }, [navigate]);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
          {status === 'loading' && (
            <div className="text-rose-600">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-semibold mb-2">Completing Login</h1>
              <p className="text-gray-600">Please wait while we verify your account...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-green-600">
              <CheckCircle className="h-12 w-12 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Login Successful!</h2>
              <p className="text-gray-600">Redirecting you now...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-red-600">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Login Failed</h2>
              <p className="text-gray-600 mb-4">{errorMessage}</p>
              <p className="text-sm text-gray-500">You will be redirected to the login page.</p>
            </div>
          )}
        </div>
      </div>
    );
  }