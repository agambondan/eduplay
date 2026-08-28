declare var google: {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        error_callback?: (error: { type: string; message?: string }) => void;
        auto_select?: boolean;
        use_fedcm_for_prompt?: boolean;
      }) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
      cancel: () => void;
    };
  };
};

interface Window {
  adsbygoogle?: Array<Record<string, unknown>>;
}
