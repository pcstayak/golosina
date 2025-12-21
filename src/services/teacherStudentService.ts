import { supabase } from '@/lib/supabase';

export type RelationshipStatus =
  | 'pending_student_request'
  | 'pending_teacher_invite'
  | 'active'
  | 'archived'
  | 'rejected';

export interface TeacherStudentRelationship {
  id: string;
  teacher_id: string;
  student_id: string;
  status: RelationshipStatus;
  initiated_by: string;
  initiated_at: string;
  status_changed_at?: string;
  status_changed_by?: string;
  student_message?: string;
  teacher_notes?: string;
  rejection_reason?: string;
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
  previous_status?: RelationshipStatus;
  created_at: string;
  updated_at: string;
}

export interface StudentInfo {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  experience_level?: string;
  relationship?: TeacherStudentRelationship;
}

export interface TeacherInfo {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  bio?: string;
  specializations?: string[];
  years_experience?: number;
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  public_profile?: boolean;
  accepts_new_students?: boolean;
  relationship?: TeacherStudentRelationship;
}

export class TeacherStudentService {
  // ==================== Student Actions ====================

  /**
   * Student sends a join request to a teacher
   */
  static async sendJoinRequest(
    teacherId: string,
    studentId: string,
    message?: string
  ): Promise<{ success: boolean; error?: string; data?: TeacherStudentRelationship }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('teacher_student_relationships')
        .insert({
          teacher_id: teacherId,
          student_id: studentId,
          status: 'pending_student_request',
          initiated_by: studentId,
          student_message: message,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending join request:', error);
        if (error.code === '23505') {
          return { success: false, error: 'Request already exists for this teacher' };
        }
        return { success: false, error: 'Failed to send join request' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error sending join request:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Student accepts a teacher's invitation
   */
  static async acceptTeacherInvite(
    relationshipId: string,
    studentId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase
        .from('teacher_student_relationships')
        .update({
          status: 'active',
          status_changed_at: new Date().toISOString(),
          status_changed_by: studentId,
        })
        .eq('id', relationshipId)
        .eq('student_id', studentId)
        .eq('status', 'pending_teacher_invite');

      if (error) {
        console.error('Error accepting teacher invite:', error);
        return { success: false, error: 'Failed to accept invitation' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error accepting teacher invite:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Student leaves a teacher's class (archives relationship and assignments)
   */
  static async leaveTeacher(
    relationshipId: string,
    studentId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      // Get the relationship to find teacher_id
      const { data: relationship, error: fetchError } = await supabase
        .from('teacher_student_relationships')
        .select('teacher_id, status')
        .eq('id', relationshipId)
        .eq('student_id', studentId)
        .single();

      if (fetchError || !relationship) {
        console.error('Error fetching relationship:', fetchError);
        return { success: false, error: 'Relationship not found' };
      }

      // Archive the relationship
      const { error: archiveError } = await supabase
        .from('teacher_student_relationships')
        .update({
          status: 'archived',
          previous_status: relationship.status,
          archived_at: new Date().toISOString(),
          archived_by: studentId,
          archive_reason: reason,
          status_changed_at: new Date().toISOString(),
          status_changed_by: studentId,
        })
        .eq('id', relationshipId);

      if (archiveError) {
        console.error('Error archiving relationship:', archiveError);
        return { success: false, error: 'Failed to leave teacher' };
      }

      // Archive all assignments from this teacher
      await this.archiveAssignments(relationship.teacher_id, studentId, reason || 'Student left class');

      return { success: true };
    } catch (error) {
      console.error('Error leaving teacher:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Student cancels a pending join request
   */
  static async cancelJoinRequest(
    relationshipId: string,
    studentId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase
        .from('teacher_student_relationships')
        .delete()
        .eq('id', relationshipId)
        .eq('student_id', studentId)
        .eq('status', 'pending_student_request');

      if (error) {
        console.error('Error canceling join request:', error);
        return { success: false, error: 'Failed to cancel request' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error canceling join request:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // ==================== Teacher Actions ====================

  /**
   * Teacher directly adds a student (active immediately, no approval needed)
   * Checks for archived relationship and restores if exists
   */
  static async addStudent(
    teacherId: string,
    studentId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string; data?: TeacherStudentRelationship }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      // Check if an archived relationship exists
      const { data: existing, error: checkError } = await supabase
        .from('teacher_student_relationships')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('student_id', studentId)
        .eq('status', 'archived')
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing relationship:', checkError);
        return { success: false, error: 'Failed to check existing relationship' };
      }

      // If archived relationship exists, restore it
      if (existing) {
        const restoreResult = await this.restoreRelationship(existing.id, teacherId, notes);
        if (!restoreResult.success) {
          return restoreResult;
        }
        return { success: true, data: restoreResult.data };
      }

      // Create new active relationship
      const { data, error } = await supabase
        .from('teacher_student_relationships')
        .insert({
          teacher_id: teacherId,
          student_id: studentId,
          status: 'active',
          initiated_by: teacherId,
          teacher_notes: notes,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding student:', error);
        if (error.code === '23505') {
          return { success: false, error: 'Student is already in your class or has a pending request' };
        }
        return { success: false, error: 'Failed to add student' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error adding student:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Teacher accepts a student's join request
   */
  static async acceptJoinRequest(
    relationshipId: string,
    teacherId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase
        .from('teacher_student_relationships')
        .update({
          status: 'active',
          status_changed_at: new Date().toISOString(),
          status_changed_by: teacherId,
          teacher_notes: notes,
        })
        .eq('id', relationshipId)
        .eq('teacher_id', teacherId)
        .eq('status', 'pending_student_request');

      if (error) {
        console.error('Error accepting join request:', error);
        return { success: false, error: 'Failed to accept join request' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error accepting join request:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Teacher rejects a student's join request
   */
  static async rejectJoinRequest(
    relationshipId: string,
    teacherId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase
        .from('teacher_student_relationships')
        .update({
          status: 'rejected',
          status_changed_at: new Date().toISOString(),
          status_changed_by: teacherId,
          rejection_reason: reason,
        })
        .eq('id', relationshipId)
        .eq('teacher_id', teacherId)
        .eq('status', 'pending_student_request');

      if (error) {
        console.error('Error rejecting join request:', error);
        return { success: false, error: 'Failed to reject request' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error rejecting join request:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Teacher removes a student from class (archives relationship and assignments)
   */
  static async removeStudent(
    relationshipId: string,
    teacherId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      // Get the relationship to find student_id
      const { data: relationship, error: fetchError } = await supabase
        .from('teacher_student_relationships')
        .select('student_id, status')
        .eq('id', relationshipId)
        .eq('teacher_id', teacherId)
        .single();

      if (fetchError || !relationship) {
        console.error('Error fetching relationship:', fetchError);
        return { success: false, error: 'Relationship not found' };
      }

      // Archive the relationship
      const { error: archiveError } = await supabase
        .from('teacher_student_relationships')
        .update({
          status: 'archived',
          previous_status: relationship.status,
          archived_at: new Date().toISOString(),
          archived_by: teacherId,
          archive_reason: reason,
          status_changed_at: new Date().toISOString(),
          status_changed_by: teacherId,
        })
        .eq('id', relationshipId);

      if (archiveError) {
        console.error('Error archiving relationship:', archiveError);
        return { success: false, error: 'Failed to remove student' };
      }

      // Archive all assignments for this student
      await this.archiveAssignments(teacherId, relationship.student_id, reason || 'Teacher removed student');

      return { success: true };
    } catch (error) {
      console.error('Error removing student:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Teacher sends an invitation to a student
   */
  static async inviteStudent(
    teacherId: string,
    studentId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string; data?: TeacherStudentRelationship }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('teacher_student_relationships')
        .insert({
          teacher_id: teacherId,
          student_id: studentId,
          status: 'pending_teacher_invite',
          initiated_by: teacherId,
          teacher_notes: notes,
        })
        .select()
        .single();

      if (error) {
        console.error('Error inviting student:', error);
        if (error.code === '23505') {
          return { success: false, error: 'Invitation already exists for this student' };
        }
        return { success: false, error: 'Failed to send invitation' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error inviting student:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // ==================== Query Methods ====================

  /**
   * Get all active students for a teacher
   */
  static async getTeacherStudents(teacherId: string): Promise<StudentInfo[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: relationships, error: relError } = await supabase
        .from('teacher_student_relationships')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (relError) {
        console.error('Error fetching teacher students:', relError);
        return [];
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const studentIds = relationships.map((r) => r.student_id);

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, display_name')
        .in('id', studentIds);

      if (profileError) {
        console.error('Error fetching student profiles:', profileError);
        return [];
      }

      const { data: studentProfiles, error: studentError } = await supabase
        .from('student_profiles')
        .select('id, experience_level')
        .in('id', studentIds);

      if (studentError) {
        console.error('Error fetching student details:', studentError);
      }

      const studentProfilesMap = new Map(
        (studentProfiles || []).map((sp) => [sp.id, sp])
      );

      const relationshipsMap = new Map(
        relationships.map((r) => [r.student_id, r])
      );

      return (profiles || []).map((profile) => ({
        ...profile,
        experience_level: studentProfilesMap.get(profile.id)?.experience_level,
        relationship: relationshipsMap.get(profile.id),
      }));
    } catch (error) {
      console.error('Error fetching teacher students:', error);
      return [];
    }
  }

  /**
   * Get all pending join requests for a teacher
   */
  static async getTeacherPendingRequests(teacherId: string): Promise<StudentInfo[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: relationships, error: relError } = await supabase
        .from('teacher_student_relationships')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('status', 'pending_student_request')
        .order('created_at', { ascending: false });

      if (relError) {
        console.error('Error fetching pending requests:', relError);
        return [];
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const studentIds = relationships.map((r) => r.student_id);

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, display_name')
        .in('id', studentIds);

      if (profileError) {
        console.error('Error fetching student profiles:', profileError);
        return [];
      }

      const relationshipsMap = new Map(
        relationships.map((r) => [r.student_id, r])
      );

      return (profiles || []).map((profile) => ({
        ...profile,
        relationship: relationshipsMap.get(profile.id),
      }));
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  }

  /**
   * Get all active teachers for a student
   */
  static async getStudentTeachers(studentId: string): Promise<TeacherInfo[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: relationships, error: relError } = await supabase
        .from('teacher_student_relationships')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (relError) {
        console.error('Error fetching student teachers:', relError);
        return [];
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const teacherIds = relationships.map((r) => r.teacher_id);

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, display_name')
        .in('id', teacherIds);

      if (profileError) {
        console.error('Error fetching teacher profiles:', profileError);
        return [];
      }

      const { data: teacherProfiles, error: teacherError } = await supabase
        .from('teacher_profiles')
        .select('*')
        .in('id', teacherIds);

      if (teacherError) {
        console.error('Error fetching teacher details:', teacherError);
      }

      const teacherProfilesMap = new Map(
        (teacherProfiles || []).map((tp) => [tp.id, tp])
      );

      const relationshipsMap = new Map(
        relationships.map((r) => [r.teacher_id, r])
      );

      return (profiles || []).map((profile) => {
        const teacherProfile = teacherProfilesMap.get(profile.id);
        return {
          ...profile,
          bio: teacherProfile?.bio,
          specializations: teacherProfile?.specializations,
          years_experience: teacherProfile?.years_experience,
          hourly_rate_min: teacherProfile?.hourly_rate_min,
          hourly_rate_max: teacherProfile?.hourly_rate_max,
          public_profile: teacherProfile?.public_profile,
          accepts_new_students: teacherProfile?.accepts_new_students,
          relationship: relationshipsMap.get(profile.id),
        };
      });
    } catch (error) {
      console.error('Error fetching student teachers:', error);
      return [];
    }
  }

  /**
   * Get all pending teacher invitations for a student
   */
  static async getStudentPendingInvites(studentId: string): Promise<TeacherInfo[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: relationships, error: relError } = await supabase
        .from('teacher_student_relationships')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'pending_teacher_invite')
        .order('created_at', { ascending: false });

      if (relError) {
        console.error('Error fetching pending invites:', relError);
        return [];
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const teacherIds = relationships.map((r) => r.teacher_id);

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, display_name')
        .in('id', teacherIds);

      if (profileError) {
        console.error('Error fetching teacher profiles:', profileError);
        return [];
      }

      const { data: teacherProfiles, error: teacherError } = await supabase
        .from('teacher_profiles')
        .select('*')
        .in('id', teacherIds);

      if (teacherError) {
        console.error('Error fetching teacher details:', teacherError);
      }

      const teacherProfilesMap = new Map(
        (teacherProfiles || []).map((tp) => [tp.id, tp])
      );

      const relationshipsMap = new Map(
        relationships.map((r) => [r.teacher_id, r])
      );

      return (profiles || []).map((profile) => {
        const teacherProfile = teacherProfilesMap.get(profile.id);
        return {
          ...profile,
          bio: teacherProfile?.bio,
          specializations: teacherProfile?.specializations,
          years_experience: teacherProfile?.years_experience,
          hourly_rate_min: teacherProfile?.hourly_rate_min,
          hourly_rate_max: teacherProfile?.hourly_rate_max,
          public_profile: teacherProfile?.public_profile,
          accepts_new_students: teacherProfile?.accepts_new_students,
          relationship: relationshipsMap.get(profile.id),
        };
      });
    } catch (error) {
      console.error('Error fetching pending invites:', error);
      return [];
    }
  }

  /**
   * Get student's outgoing join requests
   */
  static async getStudentPendingRequests(studentId: string): Promise<TeacherInfo[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: relationships, error: relError } = await supabase
        .from('teacher_student_relationships')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'pending_student_request')
        .order('created_at', { ascending: false });

      if (relError) {
        console.error('Error fetching pending requests:', relError);
        return [];
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const teacherIds = relationships.map((r) => r.teacher_id);

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, display_name')
        .in('id', teacherIds);

      if (profileError) {
        console.error('Error fetching teacher profiles:', profileError);
        return [];
      }

      const { data: teacherProfiles, error: teacherError } = await supabase
        .from('teacher_profiles')
        .select('*')
        .in('id', teacherIds);

      if (teacherError) {
        console.error('Error fetching teacher details:', teacherError);
      }

      const teacherProfilesMap = new Map(
        (teacherProfiles || []).map((tp) => [tp.id, tp])
      );

      const relationshipsMap = new Map(
        relationships.map((r) => [r.teacher_id, r])
      );

      return (profiles || []).map((profile) => {
        const teacherProfile = teacherProfilesMap.get(profile.id);
        return {
          ...profile,
          bio: teacherProfile?.bio,
          specializations: teacherProfile?.specializations,
          years_experience: teacherProfile?.years_experience,
          hourly_rate_min: teacherProfile?.hourly_rate_min,
          hourly_rate_max: teacherProfile?.hourly_rate_max,
          public_profile: teacherProfile?.public_profile,
          accepts_new_students: teacherProfile?.accepts_new_students,
          relationship: relationshipsMap.get(profile.id),
        };
      });
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  }

  /**
   * Check if a teacher can assign a lesson to a student
   */
  static async canAssignLesson(teacherId: string, studentId: string): Promise<boolean> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('teacher_student_relationships')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error checking assignment permission:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking assignment permission:', error);
      return false;
    }
  }

  /**
   * Get all browsable teachers (public profiles accepting students)
   */
  static async getBrowsableTeachers(studentId?: string): Promise<TeacherInfo[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: teacherProfiles, error: teacherError } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('public_profile', true)
        .eq('accepts_new_students', true)
        .order('id');

      if (teacherError) {
        console.error('Error fetching browsable teachers:', teacherError);
        return [];
      }

      if (!teacherProfiles || teacherProfiles.length === 0) {
        return [];
      }

      const teacherIds = teacherProfiles.map((tp) => tp.id);

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, display_name')
        .in('id', teacherIds);

      if (profileError) {
        console.error('Error fetching teacher user profiles:', profileError);
        return [];
      }

      // If studentId provided, get relationship status
      let relationshipsMap = new Map();
      if (studentId) {
        const { data: relationships, error: relError } = await supabase
          .from('teacher_student_relationships')
          .select('*')
          .eq('student_id', studentId)
          .in('teacher_id', teacherIds);

        if (!relError && relationships) {
          relationshipsMap = new Map(
            relationships.map((r) => [r.teacher_id, r])
          );
        }
      }

      const teacherProfilesMap = new Map(
        teacherProfiles.map((tp) => [tp.id, tp])
      );

      return (profiles || []).map((profile) => {
        const teacherProfile = teacherProfilesMap.get(profile.id);
        return {
          ...profile,
          bio: teacherProfile?.bio,
          specializations: teacherProfile?.specializations,
          years_experience: teacherProfile?.years_experience,
          hourly_rate_min: teacherProfile?.hourly_rate_min,
          hourly_rate_max: teacherProfile?.hourly_rate_max,
          public_profile: teacherProfile?.public_profile,
          accepts_new_students: teacherProfile?.accepts_new_students,
          relationship: relationshipsMap.get(profile.id),
        };
      });
    } catch (error) {
      console.error('Error fetching browsable teachers:', error);
      return [];
    }
  }

  // ==================== Internal Helpers ====================

  /**
   * Archive all assignments between a teacher and student
   */
  private static async archiveAssignments(
    teacherId: string,
    studentId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase
        .from('lesson_assignments')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archived_by: teacherId,
          archive_reason: reason,
        })
        .eq('assigned_by', teacherId)
        .eq('assigned_to', studentId)
        .eq('is_archived', false);

      if (error) {
        console.error('Error archiving assignments:', error);
        return { success: false, error: 'Failed to archive assignments' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error archiving assignments:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Restore an archived relationship and its assignments
   */
  private static async restoreRelationship(
    relationshipId: string,
    teacherId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string; data?: TeacherStudentRelationship }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      // Get the relationship to find student_id
      const { data: relationship, error: fetchError } = await supabase
        .from('teacher_student_relationships')
        .select('*')
        .eq('id', relationshipId)
        .single();

      if (fetchError || !relationship) {
        console.error('Error fetching relationship:', fetchError);
        return { success: false, error: 'Relationship not found' };
      }

      // Restore the relationship to active
      const { data: updated, error: updateError } = await supabase
        .from('teacher_student_relationships')
        .update({
          status: 'active',
          status_changed_at: new Date().toISOString(),
          status_changed_by: teacherId,
          teacher_notes: notes || relationship.teacher_notes,
          archived_at: null,
          archived_by: null,
          archive_reason: null,
        })
        .eq('id', relationshipId)
        .select()
        .single();

      if (updateError) {
        console.error('Error restoring relationship:', updateError);
        return { success: false, error: 'Failed to restore relationship' };
      }

      // Restore archived assignments
      const { error: restoreError } = await supabase
        .from('lesson_assignments')
        .update({
          is_archived: false,
          archived_at: null,
          archived_by: null,
          archive_reason: null,
        })
        .eq('assigned_by', teacherId)
        .eq('assigned_to', relationship.student_id)
        .eq('is_archived', true);

      if (restoreError) {
        console.error('Error restoring assignments:', restoreError);
        // Don't fail the whole operation if assignment restoration fails
      }

      return { success: true, data: updated };
    } catch (error) {
      console.error('Error restoring relationship:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}
