export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_via: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          marked_via?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_via?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          batch: string
          closed_at: string | null
          course: string
          created_at: string
          duration_minutes: number
          expires_at: string
          gps_required: boolean
          id: string
          started_at: string
          started_by: string
          status: string
          subject: string
          updated_at: string
          wifi_required: boolean
        }
        Insert: {
          batch: string
          closed_at?: string | null
          course: string
          created_at?: string
          duration_minutes?: number
          expires_at: string
          gps_required?: boolean
          id?: string
          started_at?: string
          started_by: string
          status?: string
          subject: string
          updated_at?: string
          wifi_required?: boolean
        }
        Update: {
          batch?: string
          closed_at?: string | null
          course?: string
          created_at?: string
          duration_minutes?: number
          expires_at?: string
          gps_required?: boolean
          id?: string
          started_at?: string
          started_by?: string
          status?: string
          subject?: string
          updated_at?: string
          wifi_required?: boolean
        }
        Relationships: []
      }
      campus_settings: {
        Row: {
          allowed_radius_meters: number
          campus_ip: string | null
          campus_ip_range: string | null
          campus_name: string
          created_at: string
          gps_verification_enabled: boolean
          id: string
          latitude: number
          longitude: number
          updated_at: string
          updated_by: string | null
          wifi_verification_enabled: boolean
        }
        Insert: {
          allowed_radius_meters?: number
          campus_ip?: string | null
          campus_ip_range?: string | null
          campus_name?: string
          created_at?: string
          gps_verification_enabled?: boolean
          id?: string
          latitude?: number
          longitude?: number
          updated_at?: string
          updated_by?: string | null
          wifi_verification_enabled?: boolean
        }
        Update: {
          allowed_radius_meters?: number
          campus_ip?: string | null
          campus_ip_range?: string | null
          campus_name?: string
          created_at?: string
          gps_verification_enabled?: boolean
          id?: string
          latitude?: number
          longitude?: number
          updated_at?: string
          updated_by?: string | null
          wifi_verification_enabled?: boolean
        }
        Relationships: []
      }
      notices: {
        Row: {
          created_at: string
          id: string
          message: string
          posted_by: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          posted_by: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          posted_by?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_attendance: boolean
          email_notices: boolean
          email_upload_alerts: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_attendance?: boolean
          email_notices?: boolean
          email_upload_alerts?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_attendance?: boolean
          email_notices?: boolean
          email_upload_alerts?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          class: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          roll_number: string | null
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          roll_number?: string | null
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          roll_number?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pyqs: {
        Row: {
          created_at: string
          file_name: string | null
          file_url: string
          id: string
          semester: string
          subject: string
          updated_at: string
          uploaded_by: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
          semester: string
          subject: string
          updated_at?: string
          uploaded_by?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
          semester?: string
          subject?: string
          updated_at?: string
          uploaded_by?: string | null
          year?: number | null
        }
        Relationships: []
      }
      smart_attendance_records: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          marked_at: string
          session_id: string
          student_id: string
          user_id: string
          verification_type: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          marked_at?: string
          session_id: string
          student_id: string
          user_id: string
          verification_type: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          marked_at?: string
          session_id?: string
          student_id?: string
          user_id?: string
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_faces: {
        Row: {
          created_at: string
          face_data: string
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          face_data: string
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          face_data?: string
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_faces_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class: string | null
          created_at: string
          email: string
          id: string
          name: string
          roll_no: string | null
          student_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          class?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          roll_no?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          class?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          roll_no?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      syllabus: {
        Row: {
          created_at: string
          file_name: string | null
          file_url: string
          id: string
          semester: string
          subject: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
          semester: string
          subject: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
          semester?: string
          subject?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          academic_year: string
          created_at: string
          current_semester: string
          default_class: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year?: string
          created_at?: string
          current_semester?: string
          default_class?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          created_at?: string
          current_semester?: string
          default_class?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
      attendance_status: "Present" | "Absent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student"],
      attendance_status: ["Present", "Absent"],
    },
  },
} as const
