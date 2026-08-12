import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Bot, 
  Sparkles, 
  ChevronRight,
  Zap,
  Crown,
  MessageSquare,
  Users,
  Clock
} from "lucide-react";
import { useLocation } from "wouter";

interface WorkersListProps {
  onSelectWorker: (workerId: number) => void;
}

export default function WorkersList({ onSelectWorker }: WorkersListProps) {
  const [, setLocation] = useLocation();
  const { data: workers, isLoading } = trpc.worker.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 overflow-y-auto h-full">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Your Workers</h1>
            <p className="text-slate-400">Loading your AI workers...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div 
                key={i}
                className="h-48 rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeWorkers = workers?.filter(w => w.wizardCompleted === 1) || [];
  const draftWorkers = workers?.filter(w => w.wizardCompleted !== 1) || [];

  return (
    <div className="p-6 lg:p-8 overflow-y-auto h-full bg-[#050810]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 
              className="text-2xl lg:text-3xl font-bold mb-2"
              style={{ 
                fontFamily: 'Satoshi, sans-serif',
                background: 'linear-gradient(135deg, #ffffff 0%, #6366F1 50%, #22D3EE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Your Workers
            </h1>
            <p className="text-slate-400">
              {activeWorkers.length === 0 
                ? "Create your first AI worker to get started" 
                : `${activeWorkers.length} active worker${activeWorkers.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button 
            onClick={() => setLocation("/onboarding")}
            className="bg-gradient-to-r from-[#6366F1] to-[#22D3EE] hover:from-[#818CF8] hover:to-[#22D3EE] text-white font-semibold rounded-xl shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50 transition-all hover:scale-[1.02]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Worker
          </Button>
        </div>

        {/* Active Workers Grid */}
        {activeWorkers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#22D3EE]" />
              Active Workers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeWorkers.map((worker) => (
                <div 
                  key={worker.id}
                  onClick={() => onSelectWorker(worker.id)}
                  className="group cursor-pointer"
                >
                  <div className="relative">
                    {/* Gradient border on hover */}
                    <div 
                      className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: 'linear-gradient(135deg, #6366F1, #22D3EE)',
                      }}
                    />
                    <Card className="relative bg-[#0a0f1a] border-0 overflow-hidden transition-transform group-hover:scale-[1.02]">
                      <CardContent className="p-5">
                        {/* Worker Avatar & Status */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                              style={{
                                background: worker.planType === 'premium' 
                                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.2))'
                                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(34, 211, 238, 0.2))',
                                boxShadow: worker.planType === 'premium'
                                  ? '0 0 20px rgba(245, 158, 11, 0.3)'
                                  : '0 0 20px rgba(99, 102, 241, 0.3)',
                              }}
                            >
                              {worker.fullName?.charAt(0) || <Bot className="h-6 w-6 text-[#22D3EE]" />}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white group-hover:text-[#22D3EE] transition-colors">
                                {worker.fullName || "Unnamed Worker"}
                              </h3>
                              <p className="text-sm text-slate-400 truncate max-w-[180px]">
                                {worker.professionalTitle || "AI Assistant"}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-[#22D3EE] transition-colors" />
                        </div>

                        {/* Status & Plan Badges */}
                        <div className="flex items-center gap-2 mb-4">
                          <Badge 
                            className={`${
                              worker.status === 'ready' 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                : worker.status === 'training'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              worker.status === 'ready' ? 'bg-emerald-400' :
                              worker.status === 'training' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'
                            }`} />
                            {worker.status === 'ready' ? 'Ready' : worker.status === 'training' ? 'Training' : 'Error'}
                          </Badge>
                          <Badge 
                            className={`${
                              worker.planType === 'premium'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/30'
                            }`}
                          >
                            {worker.planType === 'premium' ? (
                              <><Crown className="h-3 w-3 mr-1" /> Premium</>
                            ) : (
                              <><Zap className="h-3 w-3 mr-1" /> Basic AI Model</>
                            )}
                          </Badge>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>0 chats</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {new Date(worker.createdAt).toLocaleDateString('en-GB', { 
                                day: 'numeric', 
                                month: 'short' 
                              })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Draft Workers */}
        {draftWorkers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Drafts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftWorkers.map((worker) => (
                <div 
                  key={worker.id}
                  onClick={() => setLocation("/wizard")}
                  className="group cursor-pointer"
                >
                  <Card className="bg-[#0a0f1a]/50 border border-white/5 hover:border-white/10 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-300">
                            {worker.fullName || "Untitled Worker"}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Step {worker.currentStep || 1} of 9
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                      >
                        Continue Setup
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeWorkers.length === 0 && draftWorkers.length === 0 && (
          <div 
            className="text-center py-16 px-4 rounded-2xl border border-dashed border-white/10"
            style={{ background: 'rgba(99, 102, 241, 0.05)' }}
          >
            <div 
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(34, 211, 238, 0.2))',
                boxShadow: '0 0 40px rgba(99, 102, 241, 0.3)',
              }}
            >
              <Bot className="h-8 w-8 text-[#22D3EE]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No workers yet</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Create your first AI worker to start automating client conversations and saving hours every day.
            </p>
            <Button 
              onClick={() => setLocation("/onboarding")}
              className="bg-gradient-to-r from-[#6366F1] to-[#22D3EE] hover:from-[#818CF8] hover:to-[#22D3EE] text-white font-semibold rounded-xl shadow-lg shadow-[#6366F1]/30"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Worker
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
