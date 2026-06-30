import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
  } from "react";
  import AsyncStorage from "@react-native-async-storage/async-storage";
  import { Auth, Progress } from "../api";
  
  export type TopicStatus = "not_started" | "done" | "revise";
  
  type User = {
    id: string;
    email: string;
    full_name?: string;
  };
  
  type AppState = {
    ready: boolean;
    user: User | null;
    examId: string | null;
    goal: string | null;
    timelineDays: number | null;
    topicStatus: Record<string, TopicStatus>;
    streakDays: number;
    lastActiveDate: string | null;
  };
  
  type Ctx = AppState & {
    setExam: (id: string) => Promise<void>;
    setGoal: (goal: string) => Promise<void>;
    setTimeline: (days: number) => Promise<void>;
    setTopicStatus: (topicId: string, status: TopicStatus) => Promise<void>;
    bumpStreak: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (
      email: string,
      password: string,
      fullName: string
    ) => Promise<void>;
    signOut: () => Promise<void>;
    resetOnboarding: () => Promise<void>;
  };
  
  const AppContext = createContext<Ctx | null>(null);
  
  const KEYS = {
    exam: "epp_exam",
    goal: "epp_goal",
    timeline: "epp_timeline",
    status: "epp_status",
    streak: "epp_streak",
    lastActive: "epp_last_active",
    token: "auth_token",
    user: "epp_user",
  };
  
  const INITIAL_STATE: AppState = {
    ready: false,
    user: null,
    examId: null,
    goal: null,
    timelineDays: null,
    topicStatus: {},
    streakDays: 0,
    lastActiveDate: null,
  };
  
  export function AppProvider({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const [state, setState] = useState(INITIAL_STATE);
  
    const updateState = useCallback((patch: Partial<AppState>) => {
      setState((prev) => ({
        ...prev,
        ...patch,
      }));
    }, []);
  
    const persistTopicStatus = useCallback(
      async (status: Record<string, TopicStatus>) => {
        await AsyncStorage.setItem(
          KEYS.status,
          JSON.stringify(status)
        );
      },
      []
    );
  
    const saveSession = useCallback(
      async (token: string, user: User) => {
        await Promise.all([
          AsyncStorage.setItem(KEYS.token, token),
          AsyncStorage.setItem(
            KEYS.user,
            JSON.stringify(user)
          ),
        ]);
  
        updateState({ user });
      },
      [updateState]
    );
  
    const loadAppState = useCallback(async () => {
      const [
        exam,
        goal,
        timeline,
        status,
        streak,
        lastActive,
        user,
      ] = await Promise.all([
        AsyncStorage.getItem(KEYS.exam),
        AsyncStorage.getItem(KEYS.goal),
        AsyncStorage.getItem(KEYS.timeline),
        AsyncStorage.getItem(KEYS.status),
        AsyncStorage.getItem(KEYS.streak),
        AsyncStorage.getItem(KEYS.lastActive),
        AsyncStorage.getItem(KEYS.user),
      ]);
  
      updateState({
        ready: true,
        user: user ? JSON.parse(user) : null,
        examId: exam,
        goal,
        timelineDays: timeline
          ? Number(timeline)
          : null,
        topicStatus: status
          ? JSON.parse(status)
          : {},
        streakDays: streak
          ? Number(streak)
          : 0,
        lastActiveDate: lastActive,
      });
    }, [updateState]);
  
    useEffect(() => {
      loadAppState();
    }, [loadAppState]);
  
    const syncProgress = useCallback(async () => {
      const { progress } = await Progress.get();
  
      if (!progress) return;
  
      const {
        exam_id,
        goal,
        timeline_days,
        topic_status,
      } = progress;
  
      await Promise.all([
        exam_id
          ? AsyncStorage.setItem(KEYS.exam, exam_id)
          : Promise.resolve(),
        goal
          ? AsyncStorage.setItem(KEYS.goal, goal)
          : Promise.resolve(),
        timeline_days
          ? AsyncStorage.setItem(
              KEYS.timeline,
              String(timeline_days)
            )
          : Promise.resolve(),
        topic_status
          ? AsyncStorage.setItem(
              KEYS.status,
              JSON.stringify(topic_status)
            )
          : Promise.resolve(),
      ]);
  
      updateState({
        examId: exam_id ?? state.examId,
        goal: goal ?? state.goal,
        timelineDays:
          timeline_days ?? state.timelineDays,
        topicStatus:
          topic_status ?? state.topicStatus,
      });
    }, [state, updateState]);
  
    const setExam = async (examId: string) => {
      await AsyncStorage.setItem(KEYS.exam, examId);
  
      updateState({ examId });
    };
  
    const setGoal = async (goal: string) => {
      await AsyncStorage.setItem(KEYS.goal, goal);
  
      updateState({ goal });
    };
  
    const setTimeline = async (timelineDays: number) => {
      await AsyncStorage.setItem(
        KEYS.timeline,
        String(timelineDays)
      );
  
      updateState({ timelineDays });
    };
  
    const setTopicStatus = async (
      topicId: string,
      status: TopicStatus
    ) => {
      const nextStatus = {
        ...state.topicStatus,
        [topicId]: status,
      };
  
      await persistTopicStatus(nextStatus);
  
      updateState({
        topicStatus: nextStatus,
      });
    };
  
    const bumpStreak = async () => {
      const today = new Date()
        .toISOString()
        .slice(0, 10);
  
      if (state.lastActiveDate === today) return;
  
      const yesterday = new Date(
        Date.now() - 86400000
      )
        .toISOString()
        .slice(0, 10);
  
      const streakDays =
        state.lastActiveDate === yesterday
          ? state.streakDays + 1
          : 1;
  
      await Promise.all([
        AsyncStorage.setItem(
          KEYS.streak,
          String(streakDays)
        ),
        AsyncStorage.setItem(
          KEYS.lastActive,
          today
        ),
      ]);
  
      updateState({
        streakDays,
        lastActiveDate: today,
      });
    };
  
    const signIn = async (
      email: string,
      password: string
    ) => {
      const response = await Auth.login(
        email,
        password
      );
  
      await saveSession(
        response.access_token,
        response.user
      );
  
      try {
        await syncProgress();
      } catch {
        // Ignore sync failures.
      }
    };
  
    const signUp = async (
      email: string,
      password: string,
      fullName: string
    ) => {
      const response = await Auth.signup(
        email,
        password,
        fullName
      );
  
      await saveSession(
        response.access_token,
        response.user
      );
    };
  
    const signOut = async () => {
      await AsyncStorage.multiRemove([
        KEYS.token,
        KEYS.user,
      ]);
  
      updateState({
        user: null,
      });
    };
  
    const resetOnboarding = async () => {
      await AsyncStorage.multiRemove([
        KEYS.exam,
        KEYS.goal,
        KEYS.timeline,
        KEYS.status,
        KEYS.streak,
        KEYS.lastActive,
      ]);
  
      updateState({
        examId: null,
        goal: null,
        timelineDays: null,
        topicStatus: {},
        streakDays: 0,
        lastActiveDate: null,
      });
    };
  
    return (
      <AppContext.Provider
        value={{
          ...state,
          setExam,
          setGoal,
          setTimeline,
          setTopicStatus,
          bumpStreak,
          signIn,
          signUp,
          signOut,
          resetOnboarding,
        }}
      >
        {children}
      </AppContext.Provider>
    );
  }
  
  export function useApp() {
    const context = useContext(AppContext);
  
    if (!context) {
      throw new Error(
        "useApp must be used within AppProvider"
      );
    }
  
    return context;
  }