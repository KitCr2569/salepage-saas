import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CustomerInfo {
    id: string;
    name: string;
    picture: string;
    email?: string;
}

interface CustomerStore {
    isLoggedIn: boolean;
    customer: CustomerInfo | null;
    accessToken: string | null;
    login: (customer: CustomerInfo, token: string) => void;
    logout: () => void;
}

export const useCustomerStore = create<CustomerStore>()(
    persist(
        (set) => ({
            isLoggedIn: false,
            customer: null,
            accessToken: null,
            login: (customer, token) =>
                set({
                    isLoggedIn: true,
                    customer,
                    accessToken: token,
                }),
            logout: () =>
                set({
                    isLoggedIn: false,
                    customer: null,
                    accessToken: null,
                }),
        }),
        {
            name: "customer-store",
        }
    )
);
