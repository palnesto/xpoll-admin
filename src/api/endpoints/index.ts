export const endpoints = {
  healthCheck: "/health-check",
  adminLogin: "/admin/auth/login",
  adminLogout: "/admin/auth/logout",
  adminMe: "/admin/auth/me",
  entities: {
    polls: {
      all: "/poll/list",
      create: "/poll",
      updateDetails: `/poll/details`,
      getById: (id: string) => `/poll/${id}`,
      delete: `/poll`,
      edit: {
        details: `/poll/details`,
        addOption: `/poll/options`,
        editOption: `/poll/options`,
      },
      getPollsByTrialId: (id: string) => `/poll/trial/${id}`,
    },
    trials: {
      all: "/trial/list",
      create: "/trial",
      update: "/trial",
      delete: "/trial",
      getById: (id: string) => `/trial/${id}`,
      cast: "/trial/cast",
    },
  },
};
