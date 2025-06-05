import {
  Policy,
  PolicyAction,
  PolicyEffect,
  PolicyPrincipal,
  PolicyResource,
  PolicyResourceOptions,
} from '@/types/core/Policy';
import { Role } from '@/types/core/Role';
import { User } from '@/types/core/User';

export interface PolicyEditorProps {
  /** Policies to display */
  policies: Policy[];
  /** Whether the policies are loading */
  policiesLoading: boolean;
  /** The error if the policies are not loading */
  policiesError: Error | null;
  /** Default resource type */
  defaultResourceType?: PolicyResource;
  /** Default resource ID */
  defaultResourceId?: string;
  /** Default principal type */
  defaultPrincipalType?: PolicyPrincipal;
  /** Default role ID */
  defaultRoleId?: string;
  /** Default user ID */
  defaultUserId?: string;
  /** Custom title for the policy editor */
  title?: string;
  /** Custom description for the policy editor */
  description?: string;
  /** Whether to show the resource column in the table */
  showResourceColumn?: boolean;
  /** Whether to show the resource ID column in the table */
  showResourceIdColumn?: boolean;
  /** Whether to allow creating new policies */
  allowCreate?: boolean;
  /** Whether to allow editing existing policies */
  allowEdit?: boolean;
  /** Whether to allow deleting policies */
  allowDelete?: boolean;
}

export interface UsePolicyFormProps {
  defaultResourceType?: PolicyResource;
  defaultResourceId?: string;
  defaultPrincipalType?: PolicyPrincipal;
  defaultRoleId?: string;
  defaultUserId?: string;
}

export interface UsePolicyFormReturn {
  showCreateForm: () => void;
  showEditForm: (policy: Policy) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isLoading: boolean;
}

export interface PolicyTableProps {
  policies: Policy[];
  showResourceColumn?: boolean;
  showResourceIdColumn?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  onEditClick: (policy: Policy) => void;
}

export interface PolicyFormProps {
  /** The policy being edited, if in edit mode */
  isEditMode?: boolean;
  /** Initial form data values */
  initialValues: PolicyFormData;
  /** Callback when form is submitted with form data */
  onSubmit: (formData: PolicyFormData) => void;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Whether the form is loading */
  isLoading: boolean;
  /** Whether the form is submitting */
  isSubmitting: boolean;
  /** The roles */
  roles: Role[];
  /** The users */
  users: User[];
  /** The policy resource options */
  policyResourceOptions: PolicyResourceOptions;
}

export interface PolicyFormData {
  effect: PolicyEffect;
  action: PolicyAction;
  resource: PolicyResource;
  principal: PolicyPrincipal;
  resourceId?: string;
  roleId?: string;
  userId?: string;
}
