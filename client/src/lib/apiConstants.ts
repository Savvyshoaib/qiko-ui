export const APICONSTANTS = {
  signup: "/signup",
  login: "/login",
  logout: "/logout",
  sendOtp: "/send-otp",
  studioUser: "/user/studio",
  studioLinked: (agentId: string) => `/agent/${encodeURIComponent(agentId)}/studio-linked`,
} as const;
