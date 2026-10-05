"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import cookies from "js-cookie";
import axios from "axios";
import { toast } from "react-hot-toast";

export const user_service =
  process.env.NEXT_PUBLIC_USER_SERVICE_URL ?? "http://localhost:5000";
export const chat_service =
  process.env.NEXT_PUBLIC_CHAT_SERVICE_URL ?? "http://localhost:5002";

export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface Chat {
  _id: string;
  users: string[];
  lastMessage?: { text: string; sender: string };
  latestMessage?: { text: string; sender: string };
  createdAt: string;
  updatedAt: string;
  unseenCount: number;
}

export interface Chats {
  user: User;
  chat: Chat;
}

interface AppContextType {
  user: User | null;
  chats: Chats[];
  loading: boolean;
  isAuth: boolean;
  setUser: Dispatch<SetStateAction<User | null>>;
  setAuth: Dispatch<SetStateAction<boolean>>;
  fetchChats: () => Promise<void>;
  logoutUser: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chats[]>([]);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    const token = cookies.get("token");
    if (!token) {
      setChats([]);
      return;
    }

    try {
      const { data } = await axios.get<{ chats: Chats[] }>(
        `${chat_service}/api/v1/chat/all`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setChats(data.chats);
    } catch (error) {
      console.error("Unable to load chats", error);
      toast.error("Could not load your conversations");
    }
  }, []);

  useEffect(() => {
    async function fetchUser() {
      const token = cookies.get("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await axios.get<User>(`${user_service}/api/v1/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(data);
        setIsAuth(true);
        await fetchChats();
      } catch (error) {
        console.error("Unable to load profile", error);
        cookies.remove("token", { path: "/" });
        setUser(null);
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    }

    void fetchUser();
  }, [fetchChats]);

  const logoutUser = () => {
    cookies.remove("token", { path: "/" });
    setUser(null);
    setChats([]);
    setIsAuth(false);
    toast.success("Logged out successfully");
  };

  return React.createElement(
    AppContext.Provider,
    {
      value: {
        user,
        chats,
        setUser,
        isAuth,
        setAuth: setIsAuth,
        loading,
        fetchChats,
        logoutUser,
      },
    },
    children,
  );
};

export const useAppData = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppData must be used within AppProvider");
  return context;
};
