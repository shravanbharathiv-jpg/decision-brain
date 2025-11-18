import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Trash2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamManagerProps {
  caseId: string;
  userId: string;
}

const TeamManager = ({ caseId, userId }: TeamManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);

  useEffect(() => {
    loadTeamData();
  }, [caseId]);

  const loadTeamData = async () => {
    try {
      const { data: membersData } = await supabase
        .from("team_members")
        .select("*")
        .eq("case_id", caseId);

      setMembers(membersData || []);

      const { data: invitesData } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("case_id", caseId);

      setInvitations(invitesData || []);
    } catch (error: any) {
      console.error("Error loading team data:", error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", inviteEmail)
        .single();

      const { error } = await supabase
        .from("team_invitations")
        .insert({
          case_id: caseId,
          inviter_user_id: userId,
          invitee_email: inviteEmail,
          invitee_user_id: existingUser?.user_id || null,
          role: inviteRole,
          status: "pending",
        });

      if (error) throw error;

      if (existingUser) {
        await supabase.rpc("create_team_notification", {
          p_user_id: existingUser.user_id,
          p_type: "team_invitation",
          p_title: "New Team Invitation",
          p_message: `You've been invited to collaborate on a decision case`,
          p_link: `/decision/${caseId}`,
          p_metadata: { case_id: caseId, role: inviteRole },
        });
      }

      toast({
        title: "Invitation sent",
        description: existingUser
          ? "User will receive an in-app notification"
          : "They'll see the invitation when they sign up",
      });

      setInviteEmail("");
      setInviteRole("viewer");
      loadTeamData();
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

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: "Team member has been removed from this case",
      });

      loadTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("team_invitations")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;

      toast({
        title: "Invitation cancelled",
      });

      loadTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Team Member
          </CardTitle>
          <CardDescription>
            Invite colleagues to collaborate on this decision
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading}>
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No team members yet
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{member.invited_user_id}</p>
                    <Badge variant="outline" className="mt-1">
                      {member.role}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{invite.invitee_email}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{invite.role}</Badge>
                      <Badge variant="secondary">{invite.status}</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCancelInvite(invite.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamManager;
