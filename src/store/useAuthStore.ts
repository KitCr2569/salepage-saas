"use client";

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

interface FacebookPage {
    id: string;
    name: string;
    picture: string;
    accessToken: string;
}

interface AuthStore {
    // User info
    isLoggedIn: boolean;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    userPicture: string | null;
    accessToken: string | null;

    // Connected page
    connectedPage: FacebookPage | null;
    availablePages: FacebookPage[];

    // Actions
    login: (data: {
        userId: string;
        userName: string;
        userEmail: string;
        userPicture: string;
        accessToken: string;
    }) => void;
    logout: () => void;
    setAvailablePages: (pages: FacebookPage[]) => void;
    connectPage: (page: FacebookPage) => void;
    disconnectPage: () => void;
}

export const useAuthStore = create<AuthStore>()(
    subscribeWithSelector(
    persist(
        (set) => ({
            isLoggedIn: false,
            userId: null,
            userName: null,
            userEmail: null,
            userPicture: null,
            accessToken: null,
            connectedPage: null,
            availablePages: [],

            login: (data) =>
                set({
                    isLoggedIn: true,
                    userId: data.userId,
                    userName: data.userName,
                    userEmail: data.userEmail,
                    userPicture: data.userPicture,
                    accessToken: data.accessToken,
                }),

            logout: () =>
                set({
                    isLoggedIn: false,
                    userId: null,
                    userName: null,
                    userEmail: null,
                    userPicture: null,
                    accessToken: null,
                    availablePages: [],
                    connectedPage: null,
                }),

            setAvailablePages: (pages) => set({ availablePages: pages }),

            connectPage: (page) => set({ connectedPage: page }),

            disconnectPage: () => set({ connectedPage: null }),
        }),
        {
            name: "auth-store-v2",
        }
    )
    )
);
