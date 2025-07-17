import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<'volunteer' | 'ngo'>('volunteer');
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [validationErrors, setValidationErrors] = useState({
    email: '',
    password: '',
    username: '',
    fullName: ''
  });
  const [touchedFields, setTouchedFields] = useState({
    email: false,
    password: false,
    username: false,
    fullName: false
  });

  // Real-time validation trigger
  useEffect(() => {
    validateForm();
  }, [email, password, username, fullName, usernameAvailable, isLogin]);

  // Debounced username availability check
  useEffect(() => {
    if (!isLogin && username.length >= 3) {
      const checkUsername = async () => {
        try {
          const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('username', username.trim());

          if (error) throw error;
          setUsernameAvailable(count === 0);
        } catch (error) {
          console.error('Username check failed:', error);
        }
      };

      const timeoutId = setTimeout(checkUsername, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setUsernameAvailable(null);
    }
  }, [username, isLogin]);

  const validateForm = () => {
    const errors = {
      email: '',
      password: '',
      username: '',
      fullName: ''
    };

    // Email validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!isLogin) {
      if (password && password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else if (password && !/[A-Z]/.test(password)) {
        errors.password = 'Include at least one uppercase letter';
      } else if (password && !/[a-z]/.test(password)) {
        errors.password = 'Include at least one lowercase letter';
      } else if (password && !/[0-9]/.test(password)) {
        errors.password = 'Include at least one number';
      }
    }

    // Username validation
    if (!isLogin) {
      if (username && username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      } else if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.username = 'Only letters, numbers, and underscores allowed';
      } else if (usernameAvailable === false) {
        errors.username = 'Username is already taken';
      }
    }

    // Full name validation
    if (!isLogin && fullName && fullName.trim().length < 2) {
      errors.fullName = 'Please enter your full name';
    }

    setValidationErrors(errors);
    return Object.values(errors).every(error => error === '');
  };

  const handleFieldTouch = (fieldName: keyof typeof touchedFields) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        toast.success('Logged in successfully!');
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim(),
              full_name: fullName.trim(),
              user_type: userType,
            },
          },
        });

        if (error) throw error;
        
        toast.success('Account created successfully!');
        onClose();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Calculate form validity
  const isFormValid = Object.values(validationErrors).every(error => error === '');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-bold mb-6">
          {isLogin ? 'Welcome Back' : userType === 'ngo' ? 'Register Organization' : 'Join as Volunteer'}
        </h2>

        {!isLogin && (
          <div className="mb-4 flex gap-4">
            <button
              onClick={() => setUserType('volunteer')}
              className={`flex-1 py-2 rounded-md ${
                userType === 'volunteer' 
                  ? 'bg-rose-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Volunteer
            </button>
            <button
              onClick={() => setUserType('ngo')}
              className={`flex-1 py-2 rounded-md ${
                userType === 'ngo' 
                  ? 'bg-rose-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              NGO
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    handleFieldTouch('fullName');
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
                {touchedFields.fullName && validationErrors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.fullName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    handleFieldTouch('username');
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
                <div className="mt-1 text-sm">
                  {touchedFields.username && validationErrors.username && (
                    <p className="text-red-500">{validationErrors.username}</p>
                  )}
                  {usernameAvailable === true && (
                    <p className="text-green-500">Username available!</p>
                  )}
                  {usernameAvailable === false && (
                    <p className="text-red-500">Username taken - try another</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                handleFieldTouch('email');
              }}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            {touchedFields.email && validationErrors.email && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                handleFieldTouch('password');
              }}
              className="w-full px-3 py-2 border rounded-md"
              required
              minLength={8}
            />
            {!isLogin && (
              <p className="text-gray-600 text-sm mt-1">
                Must contain uppercase, lowercase, and number
              </p>
            )}
            {touchedFields.password && validationErrors.password && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full bg-rose-600 text-white py-2 rounded-md disabled:opacity-50 flex justify-center items-center transition-colors"
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="mt-4 text-center">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-rose-600 hover:text-rose-700 hover:underline font-medium"
          >
            {isLogin ? 'Register here' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
