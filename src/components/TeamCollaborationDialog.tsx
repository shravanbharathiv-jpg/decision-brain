import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  id: string;
  invited_user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

interface TeamCollaborationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  userId: string;
}

export const TeamCollaborationDialog = ({ open, onOpenChange, caseId, userId }: TeamCollaborationDialogProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open, caseId]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, invited_user_id, role, created_at, case_id, user_id")
        .eq("case_id", caseId);

      if (error) throw error;

      // Fetch profile info separately
      if (data && data.length > 0) {
        const userIds = data.map(m => m.invited_user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", userIds);

        const membersWithProfiles = data.map(member => ({
          ...member,
          profiles: profilesData?.find(p => p.user_id === member.invited_user_id),
        }));

        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleInvite = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .single();

      if (profileError || !profiles) {
        throw new Error("User not found. They must sign up first.");
      }

      // Add team member
      const { error: insertError } = await supabase
        .from("team_members")
        .insert({
          case_id: caseId,
          user_id: userId,
          invited_user_id: profiles.user_id,
          role,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Team member invited successfully",
      });

      setEmail("");
      setRole("viewer");
      loadMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member removed",
      });

      loadMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Collaboration
          </DialogTitle>
          <DialogDescription>
            Invite team members to collaborate on this decision case
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-3">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer (Read only)</SelectItem>
                  <SelectItem value="editor">Editor (Can edit)</SelectItem>
                  <SelectItem value="admin">Admin (Full access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleInvite} disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Invite Team Member
            </Button>
          </div>

          <div className="space-y-3">
            <Label>Current Team Members</Label>
            {loadingMembers ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No team members yet</div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {member.profiles?.full_name || member.profiles?.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.profiles?.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{member.role}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(member.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
