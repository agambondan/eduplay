import api from "./client";

export interface DirectAd {
    id: string;
    title: string;
    image_url: string;
    click_url: string;
    slot_type: string;
    priority: number;
    is_active: boolean;
    start_at: string | null;
    end_at: string | null;
    created_at: string;
}

export const adsApi = {
    getActiveSlot: (slot: "banner" | "interstitial" | "rewarded") =>
        api.get<{ data: DirectAd }>(`/ads?slot=${slot}`).then((r) => r.data.data),

    // Admin
    list: () => api.get<{ data: DirectAd[] }>("/admin/ads").then((r) => r.data.data),
    create: (form: FormData) =>
        api.post<{ data: DirectAd }>("/admin/ads", form, {
            headers: { "Content-Type": "multipart/form-data" },
        }).then((r) => r.data.data),
    update: (id: string, body: Partial<DirectAd>) =>
        api.patch<{ data: DirectAd }>(`/admin/ads/${id}`, body).then((r) => r.data.data),
    delete: (id: string) => api.delete(`/admin/ads/${id}`),
};
