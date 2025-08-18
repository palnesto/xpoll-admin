export const endpoints = {
  healthCheck: "/health-check",
  adminLogin: "/admin/auth/login",
  adminLogout: "/admin/auth/logout",
  adminMe: "/admin/auth/me",
  entities: {
    polls: {
      all: "/poll/list",
      create: "/poll",
      update: (id: string) => `/poll/${id}`,
      delete: (id: string) => `/poll/${id}`,
    },
  },
};
