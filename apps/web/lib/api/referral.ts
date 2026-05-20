import api from "./index";
import { ApiResponse } from "@/types/api";

export interface ReferralStats {
    referral_code: string;
    total_referrals: number;
    total_xp_earned: number;
}

export const referralApi = {
    getStats: async (): Promise<ReferralStats> => {
        const res = await api.get<ApiResponse<ReferralStats>>("/referral/stats");
        return res.data.data;
    },
    apply: async (code: string): Promise<{ message: string; xp_bonus: number }> => {
        const res = await api.post<ApiResponse<{ message: string; xp_bonus: number }>>(
            "/referral/apply",
            { code },
        );
        return res.data.data;
    },
};
