import { useState } from "react";
import GlobalLayout from "@/components/GlobalLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GeneralSettings from "./GeneralSettings";
import TeamAccess from "./TeamAccess";
import SlackSetting from "@/components/dashboard/SlackSetting";
import ClickUpSetting from "@/components/dashboard/ClickUpSetting";
import CalendlyToken from "@/components/dashboard/CalendlyToken";
import GmailSetting from "@/components/dashboard/GmailSetting";
import WithPermission from "@/_core/components/WithPermission";
import { ClipboardList, Settings2, Users } from "lucide-react";

export default function AppSettings() {
  const [activeIntegration, setActiveIntegration] = useState<"slack" | "calendly" | "clickup" | "gmail" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openIntegration = (integration: "slack" | "calendly" | "clickup" | "gmail") => {
    setActiveIntegration(integration);
    setModalOpen(true);
  };

  return (
    <GlobalLayout activeSection="settings">
      <div className="p-6 lg:p-8 overflow-y-auto h-full">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1
              className="text-2xl lg:text-3xl font-bold mb-2"
              style={{
                fontFamily: 'Satoshi, sans-serif',
                background: 'linear-gradient(135deg, #ffffff 0%, #6366F1 50%, #22D3EE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Settings
            </h1>
            <p className="text-slate-400">
              Manage your account and preferences
            </p>
          </div>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="h-12 rounded-2xl bg-[#050b16] p-1.5">
              <TabsTrigger
                value="general"
                className="rounded-xl px-6 text-slate-300 data-[state=active]:text-cyan-300 data-[state=active]:bg-[#16243a] data-[state=active]:shadow-[0_0_0_1px_rgba(34,211,238,0.18)] transition-all"
              >
                <span className="inline-flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  General
                </span>
              </TabsTrigger>
              <WithPermission allowFor={["admin", "owner"]}>
                <TabsTrigger
                  value="team"
                  className="rounded-xl px-6 text-slate-300 data-[state=active]:text-cyan-300 data-[state=active]:bg-[#16243a] data-[state=active]:shadow-[0_0_0_1px_rgba(34,211,238,0.18)] transition-all"
                >
                  <span className="inline-flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team
                  </span>
                </TabsTrigger>
              </WithPermission>
              <TabsTrigger
                value="integrations"
                className="rounded-xl px-6 text-slate-300 data-[state=active]:text-emerald-300 data-[state=active]:bg-[#16243a] data-[state=active]:shadow-[0_0_0_1px_rgba(16,185,129,0.2)] transition-all"
              >
                <span className="inline-flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Integration
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralSettings />
            </TabsContent>
            <TabsContent value="team">
              <TeamAccess embedded />
            </TabsContent>
            <TabsContent value="integrations" className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Integration</h2>
                <p className="text-sm text-slate-400 max-w-2xl">
                  Manage your external integrations in one place. Connect Slack, Calendly, ClickUp, and Gmail so workers can send messages, schedule meetings, manage tasks, and stay notified.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={() => openIntegration("slack")}
                  className="group rounded-3xl border border-white/10 bg-[#0b1322] p-5 text-center transition hover:border-cyan-400 hover:bg-[#101827]"
                >
                  <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-3xl">
                    <svg width="50" height="50" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_0_113)">
                        <g clipPath="url(#clip1_0_113)">
                          <path d="M26.8925 80.886C26.8925 88.2866 20.8469 94.3323 13.4463 94.3323C6.04561 94.3323 0 88.2866 0 80.886C0 73.4853 6.04561 67.4397 13.4463 67.4397H26.8925V80.886Z" fill="#E01E5A"/>
                          <path d="M33.6675 80.886C33.6675 73.4853 39.7131 67.4397 47.1137 67.4397C54.5144 67.4397 60.56 73.4853 60.56 80.886V114.554C60.56 121.954 54.5144 128 47.1137 128C39.7131 128 33.6675 121.954 33.6675 114.554V80.886Z" fill="#E01E5A"/>
                          <path d="M47.1137 26.8925C39.7131 26.8925 33.6675 20.8469 33.6675 13.4463C33.6675 6.0456 39.7131 -3.8147e-06 47.1137 -3.8147e-06C54.5144 -3.8147e-06 60.56 6.0456 60.56 13.4463V26.8925H47.1137Z" fill="#36C5F0"/>
                          <path d="M47.114 33.6678C54.5147 33.6678 60.5603 39.7134 60.5603 47.114C60.5603 54.5147 54.5147 60.5603 47.114 60.5603H13.4463C6.0456 60.5603 0 54.5147 0 47.114C0 39.7134 6.0456 33.6678 13.4463 33.6678H47.114Z" fill="#36C5F0"/>
                          <path d="M101.107 47.114C101.107 39.7134 107.153 33.6678 114.554 33.6678C121.954 33.6678 128 39.7134 128 47.114C128 54.5147 121.954 60.5603 114.554 60.5603H101.107V47.114Z" fill="#2EB67D"/>
                          <path d="M94.3322 47.114C94.3322 54.5147 88.2866 60.5603 80.8859 60.5603C73.4853 60.5603 67.4397 54.5147 67.4397 47.114V13.4463C67.4397 6.0456 73.4853 -3.8147e-06 80.8859 -3.8147e-06C88.2866 -3.8147e-06 94.3322 6.0456 94.3322 13.4463V47.114Z" fill="#2EB67D"/>
                          <path d="M80.8859 101.107C88.2866 101.107 94.3322 107.153 94.3322 114.554C94.3322 121.954 88.2866 128 80.8859 128C73.4853 128 67.4397 121.954 67.4397 114.554V101.107H80.8859Z" fill="#ECB22E"/>
                          <path d="M80.8859 94.3323C73.4853 94.3323 67.4397 88.2866 67.4397 80.886C67.4397 73.4853 73.4853 67.4397 80.8859 67.4397H114.554C121.954 67.4397 128 73.4853 128 80.886C128 88.2866 121.954 94.3323 114.554 94.3323H80.8859Z" fill="#ECB22E"/>
                        </g>
                      </g>
                      <defs>
                        <clipPath id="clip0_0_113">
                          <rect width="128" height="128" fill="white"/>
                        </clipPath>
                        <clipPath id="clip1_0_113">
                          <rect width="128" height="128" fill="white"/>
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                  <div className="mt-6 text-center">
                    <h3 className="text-base font-semibold text-white">Slack</h3>
                    <p className="text-sm text-slate-400">
                      Bot token from your Slack app for chat messages and DMs.
                    </p>
                  </div>
                  <div className="mt-6 rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300 group-hover:bg-white/10">
                    Configure
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => openIntegration("calendly")}
                  className="group rounded-3xl border border-white/10 bg-[#0b1322] p-5 text-center transition hover:border-cyan-400 hover:bg-[#101827]"
                >
                  <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-3xl">
                    <svg width="50" height="50" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_58_7888)">
                        <path d="M87.2953 83.0031C83.2336 86.6085 78.1659 91.0955 68.9506 91.0955H63.4552C56.794 91.0955 50.7372 88.6776 46.4031 84.2885C42.1693 80.0022 39.8374 74.1342 39.8374 67.7644V60.2358C39.8374 53.866 42.1693 47.998 46.4031 43.7117C50.7372 39.3226 56.794 36.9047 63.4552 36.9047H68.9506C78.1659 36.9047 83.2288 41.3917 87.2953 44.9971C91.5124 48.7363 95.156 51.9642 104.861 51.9642C106.342 51.9645 107.82 51.8463 109.281 51.6106C109.281 51.5819 109.262 51.5556 109.25 51.5269C108.668 50.0832 107.986 48.682 107.207 47.3338L100.718 36.0923C97.7924 31.0252 93.5845 26.8174 88.5174 23.8916C83.4502 20.9659 77.7023 19.4254 71.8511 19.4248H58.8703C53.0191 19.4254 47.2712 20.9659 42.204 23.8916C37.1368 26.8174 32.929 31.0252 30.0032 36.0923L23.5139 47.3338C20.5886 52.4011 19.0486 58.149 19.0486 64.0001C19.0486 69.8511 20.5886 75.5991 23.5139 80.6664L30.0032 91.9079C32.9291 96.9747 37.1371 101.182 42.2042 104.108C47.2714 107.033 53.0193 108.573 58.8703 108.573H71.8511C77.7021 108.573 83.45 107.033 88.5172 104.108C93.5843 101.182 97.7923 96.9747 100.718 91.9079L107.207 80.6664C107.986 79.3182 108.668 77.917 109.25 76.4732C109.25 76.4446 109.272 76.4183 109.281 76.3896C107.82 76.1539 106.342 76.0357 104.861 76.036C95.156 76.036 91.5124 79.2639 87.2953 83.0031Z" fill="#006BFF"/>
                        <path d="M68.9506 43.7236H63.4553C53.32 43.7236 46.6588 50.9631 46.6588 60.2311V67.7596C46.6588 77.0276 53.32 84.267 63.4553 84.267H68.9506C83.721 84.267 82.5694 69.2147 104.861 69.2147C106.975 69.213 109.084 69.4057 111.162 69.7905C111.838 65.9607 111.838 62.042 111.162 58.2121C109.084 58.5989 106.975 58.7924 104.861 58.7903C82.5622 58.7879 83.721 43.7236 68.9506 43.7236Z" fill="#006BFF"/>
                        <path d="M123.973 75.2929C120.173 72.5156 115.793 70.6367 111.162 69.7976C111.162 69.8358 111.15 69.874 111.143 69.9099C110.745 72.1307 110.121 74.3051 109.281 76.3991C113.108 76.9911 116.738 78.4849 119.873 80.7571C119.873 80.7906 119.854 80.824 119.842 80.8598C118.065 86.6297 115.38 92.0794 111.888 97.0041C108.436 101.883 104.244 106.194 99.4638 109.782C87.892 118.487 73.4479 122.477 59.0483 120.947C44.6487 119.416 31.3663 112.479 21.8831 101.535C12.3999 90.5915 7.4224 76.4573 7.95571 61.9863C8.48901 47.5154 14.4934 33.7859 24.7564 23.5701C31.7285 16.6031 40.3825 11.5558 49.8793 8.91749C59.3761 6.27916 69.3934 6.13932 78.9602 8.51153C88.5269 10.8837 97.3184 15.6875 104.482 22.4571C111.646 29.2267 116.94 37.7325 119.849 47.1497C119.861 47.1856 119.871 47.219 119.88 47.2525C116.743 49.5249 113.11 51.0179 109.281 51.6081C110.121 53.704 110.746 55.8798 111.145 58.1021C111.145 58.1379 111.145 58.1738 111.162 58.2072C115.793 57.3703 120.174 55.4911 123.973 52.7119C127.626 50.0097 126.919 46.9562 126.362 45.1499C118.313 18.9994 93.9685 0 65.1851 0C29.8407 0 1.18628 28.6544 1.18628 63.9988C1.18628 99.3432 29.8407 128 65.1851 128C93.9685 128 118.313 109.001 126.35 82.8573C126.919 81.051 127.626 77.9975 123.973 75.2929Z" fill="#006BFF"/>
                        <path d="M109.281 51.6083C107.82 51.8439 106.342 51.9622 104.861 51.9619C95.156 51.9619 91.5124 48.734 87.2953 44.9948C83.2336 41.3894 78.166 36.9023 68.9506 36.9023H63.4553C56.794 36.9023 50.7372 39.3203 46.4031 43.7094C42.1693 47.9957 39.8374 53.8637 39.8374 60.2335V67.7621C39.8374 74.1318 42.1693 79.9999 46.4031 84.2862C50.7372 88.6753 56.794 91.0932 63.4553 91.0932H68.9506C78.166 91.0932 83.2288 86.6062 87.2953 83.0008C91.5124 79.2616 95.156 76.0337 104.861 76.0337C106.342 76.0334 107.82 76.1516 109.281 76.3873C110.121 74.2934 110.745 72.119 111.143 69.8981C111.143 69.8622 111.157 69.824 111.162 69.7858C109.084 69.401 106.975 69.2082 104.861 69.21C82.5622 69.21 83.721 84.2623 68.9506 84.2623H63.4553C53.32 84.2623 46.6588 77.0229 46.6588 67.7549V60.2359C46.6588 50.9679 53.32 43.7285 63.4553 43.7285H68.9506C83.721 43.7285 82.5694 58.7808 104.861 58.7808C106.975 58.7829 109.084 58.5894 111.162 58.2026C111.162 58.1692 111.162 58.1333 111.145 58.0975C110.745 55.8769 110.121 53.7026 109.281 51.6083Z" fill="#0AE9EF"/>
                      </g>
                      <defs>
                        <clipPath id="clip0_58_7888">
                          <rect width="125.627" height="128" fill="white" transform="translate(1.18628)"/>
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                  <div className="mt-6 text-center">
                    <h3 className="text-base font-semibold text-white">Calendly</h3>
                    <p className="text-sm text-slate-400">
                      Connect Calendly so workers can schedule meetings.
                    </p>
                  </div>
                  <div className="mt-6 rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300 group-hover:bg-white/10">
                    Configure
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => openIntegration("clickup")}
                  className="group rounded-3xl border border-white/10 bg-[#0b1322] p-5 text-center transition hover:border-cyan-400 hover:bg-[#101827]"
                >
                  <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-3xl">
                    <svg width="50" height="50" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_0_782)">
                        <path fillRule="evenodd" clipRule="evenodd" d="M10.6992 98.4316L30.3466 83.2584C40.8512 96.8754 51.9393 103.295 64.1947 103.295C76.45 103.295 87.3436 97.0699 97.2646 83.4529L117.301 98.2371C102.906 117.69 85.0092 128 64.1947 128C43.5746 128 25.4834 117.69 10.6992 98.4316Z" fill="url(#paint0_linear_0_782)"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M64.1948 32.8754L29.1796 63.0274L13.0337 44.1581L64.3893 0L115.356 44.1581L99.0154 62.8328L64.1948 32.8754Z" fill="url(#paint1_linear_0_782)"/>
                      </g>
                      <defs>
                        <linearGradient id="paint0_linear_0_782" x1="10.6992" y1="105.651" x2="117.388" y2="105.651" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#8930FD"/>
                          <stop offset="1" stopColor="#49CCF9"/>
                        </linearGradient>
                        <linearGradient id="paint1_linear_0_782" x1="13.0245" y1="31.5028" x2="115.248" y2="31.5028" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FF02F0"/>
                          <stop offset="1" stopColor="#FFC800"/>
                        </linearGradient>
                        <clipPath id="clip0_0_782">
                          <rect width="106.602" height="128" fill="white" transform="translate(10.6992)"/>
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                  <div className="mt-6 text-center">
                    <div className="inline-flex items-center justify-center gap-2">
                      <h3 className="text-base font-semibold text-white">ClickUp</h3>
                    </div>
                    <p className="text-sm text-slate-400">
                      Connect ClickUp so workers can create and manage tasks.
                    </p>
                  </div>
                  <div className="mt-6 rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300 group-hover:bg-white/10">
                    Configure
                  </div>
                </button>
                {/* <button
                  type="button"
                  onClick={() => openIntegration("gmail")}
                  className="group rounded-3xl border border-white/10 bg-[#0b1322] p-5 text-center transition hover:border-cyan-400 hover:bg-[#101827]"
                >
                  <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-3xl">
                    <svg width="50" height="50" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_0_12)">
                        <path d="M8.7275 113.854H29.091V64.4L0 42.5817V105.127C0 109.949 3.9055 113.855 8.7275 113.855V113.854Z" fill="#4285F4"/>
                        <path d="M98.909 113.854H119.273C124.095 113.854 128 109.949 128 105.127V42.5817L98.909 64.4V113.854Z" fill="#34A853"/>
                        <path d="M98.909 26.5817V64.4L128 42.5817V30.9455C128 20.16 115.687 14 107.054 20.4727L98.909 26.5817Z" fill="#FBBC04"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M29.091 64.4V26.5817L64 52.7638L98.909 26.5817V64.4L64 90.5817L29.091 64.4Z" fill="#EA4335"/>
                        <path d="M0 30.9455V42.5817L29.091 64.4V26.5817L20.9455 20.4727C12.3125 14 0 20.16 0 30.945V30.9455Z" fill="#C5221F"/>
                      </g>
                      <defs>
                        <clipPath id="clip0_0_12">
                          <rect width="128" height="99.855" fill="white" transform="translate(0 14)"/>
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                  <div className="mt-6 text-center">
                    <h3 className="text-base font-semibold text-white">Gmail</h3>
                    <p className="text-sm text-slate-400">
                      Connect Gmail to send email and automation.
                    </p>
                  </div>
                  <div className="mt-6 rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300 group-hover:bg-white/10">
                    Coming soon
                  </div>
                </button> */}
              </div>
              <Dialog open={modalOpen} onOpenChange={(open) => {
                setModalOpen(open);
                if (!open) setActiveIntegration(null);
              }}>
                <DialogContent className="max-w-2xl border-white/10 bg-[#07101f] text-white max-h-[calc(100dvh-2rem)] overflow-y-auto">
                  <DialogHeader className="space-y-2 text-left">
                    <DialogTitle className="text-xl font-semibold">
                      {activeIntegration === "slack" && "Slack Integration"}
                      {activeIntegration === "calendly" && "Calendly Integration"}
                      {activeIntegration === "clickup" && "ClickUp Integration"}
                      {activeIntegration === "gmail" && "Gmail Integration"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                      {activeIntegration === "slack" && "Enter your Slack bot token and settings so workers can send messages from chat."}
                      {activeIntegration === "calendly" && "Connect your Calendly account so workers can schedule meetings from chat and voice."}
                      {activeIntegration === "clickup" && "Connect ClickUp so workers can create tasks and update work from chat."}
                      {activeIntegration === "gmail" && "Enter your Gmail settings so workers can send email notifications and automation from chat."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    {activeIntegration === "slack" && <SlackSetting />}
                    {activeIntegration === "calendly" && <CalendlyToken />}
                    {activeIntegration === "clickup" && <ClickUpSetting />}
                    {activeIntegration === "gmail" && <GmailSetting />}
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </GlobalLayout>
  );
}
