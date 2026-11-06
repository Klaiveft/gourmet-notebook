
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "families": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"invite_code": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"invite_code"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"invite_code"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "families_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"family_members": {
                  Row: {
                    "family_id": string,"joined_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "family_id": string,"joined_at"?: string,"user_id": string
                  }
                  Update: {
                    "family_id"?: string,"joined_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_members_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "family_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"created_at": string | null,"display_name": string | null,"id": string,"preferred_units": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string | null,"display_name"?: string | null,"id": string,"preferred_units"?: string | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string | null,"display_name"?: string | null,"id"?: string,"preferred_units"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"recipe_comments": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"recipe_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"recipe_id": string,"user_id"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"recipe_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_comments_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_ingredients": {
                  Row: {
                    "id": string,"name": string,"notes": string | null,"order_index": number,"quantity": number | null,"recipe_id": string,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"notes"?: string | null,"order_index"?: number,"quantity"?: number | null,"recipe_id": string,"unit"?: string | null
                  }
                  Update: {
                    "id"?: string,"name"?: string,"notes"?: string | null,"order_index"?: number,"quantity"?: number | null,"recipe_id"?: string,"unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_ingredients_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_likes": {
                  Row: {
                    "created_at": string,"recipe_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"recipe_id": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"recipe_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_likes_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_steps": {
                  Row: {
                    "duration_minutes": number | null,"id": string,"instruction": string,"order_index": number,"recipe_id": string,"step_number": number,"tip": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "duration_minutes"?: number | null,"id"?: string,"instruction": string,"order_index"?: number,"recipe_id": string,"step_number": number,"tip"?: string | null
                  }
                  Update: {
                    "duration_minutes"?: number | null,"id"?: string,"instruction"?: string,"order_index"?: number,"recipe_id"?: string,"step_number"?: number,"tip"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_steps_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_trials": {
                  Row: {
                    "comment": string | null,"created_at": string | null,"id": string,"modifications": string | null,"rating": number | null,"recipe_id": string,"trial_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string | null,"id"?: string,"modifications"?: string | null,"rating"?: number | null,"recipe_id": string,"trial_date"?: string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string | null,"id"?: string,"modifications"?: string | null,"rating"?: number | null,"recipe_id"?: string,"trial_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_trials_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipes": {
                  Row: {
                    "category": Database["public"]['Enums']["recipe_category"],"cook_time_minutes": number | null,"created_at": string | null,"description": string | null,"difficulty": Database["public"]['Enums']["recipe_difficulty"],"forked_from": string | null,"id": string,"image_credit": string | null,"image_url": string | null,"is_favorite": boolean | null,"is_public": boolean,"is_shared": boolean,"prep_time_minutes": number | null,"published_at": string | null,"servings": number | null,"shared_at": string | null,"source_platform": string | null,"source_url": string | null,"title": string,"updated_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["recipe_category"],"cook_time_minutes"?: number | null,"created_at"?: string | null,"description"?: string | null,"difficulty"?: Database["public"]['Enums']["recipe_difficulty"],"forked_from"?: string | null,"id"?: string,"image_credit"?: string | null,"image_url"?: string | null,"is_favorite"?: boolean | null,"is_public"?: boolean,"is_shared"?: boolean,"prep_time_minutes"?: number | null,"published_at"?: string | null,"servings"?: number | null,"shared_at"?: string | null,"source_platform"?: string | null,"source_url"?: string | null,"title": string,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["recipe_category"],"cook_time_minutes"?: number | null,"created_at"?: string | null,"description"?: string | null,"difficulty"?: Database["public"]['Enums']["recipe_difficulty"],"forked_from"?: string | null,"id"?: string,"image_credit"?: string | null,"image_url"?: string | null,"is_favorite"?: boolean | null,"is_public"?: boolean,"is_shared"?: boolean,"prep_time_minutes"?: number | null,"published_at"?: string | null,"servings"?: number | null,"shared_at"?: string | null,"source_platform"?: string | null,"source_url"?: string | null,"title"?: string,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipes_forked_from_fkey"
      columns: ["forked_from"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipes_user_profile_fk"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "copy_recipe":
{ Args: { "p_recipe_id": string }; Returns: string
                           },
"create_family":
{ Args: { "p_name": string }; Returns: string
                           },
"family_preview":
{ Args: { "p_code": string }; Returns: string
                           },
"is_family_member":
{ Args: { "p_family_id": string }; Returns: boolean
                           },
"join_family":
{ Args: { "p_code": string }; Returns: string
                           },
"save_recipe":
{ Args: { "p_ingredients": Json,"p_recipe": Json,"p_recipe_id"?: string,"p_steps": Json }; Returns: string
                           },
"shares_family_with":
{ Args: { "p_user_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "recipe_category": "Entrée"|"Plat"|"Dessert"|"Boulangerie"|"Sauce & Condiment"|"Autre","recipe_difficulty": "Facile"|"Moyen"|"Difficile"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "recipe_category": ["Entrée", "Plat", "Dessert", "Boulangerie", "Sauce & Condiment", "Autre"],"recipe_difficulty": ["Facile", "Moyen", "Difficile"]
          }
        }
} as const
