import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { Table } from "../../components/Table";
import { ToastStack, type ToastItem } from "../../components/ToastStack";
import { API_URL, ApiError, api } from "../../utils/api";
import { setUser } from "../../utils/auth";

type AdminProfile = {
  id: number;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  full_name: string;
  admin_role: "admin" | "super_admin";
  avatar_url: string | null;
  bio: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  is_public: boolean;
  sort_order: number;
};

type ProfileFormState = {
  email: string;
  full_name: string;
  phone: string;
  job_title: string;
  bio: string;
  avatar_url: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
};

type ManageAdminForm = {
  full_name: string;
  email: string;
  phone: string;
  job_title: string;
  bio: string;
  avatar_url: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  admin_role: "admin" | "super_admin";
  is_public: boolean;
  new_password: string;
};

type PasswordFormState = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

const initialForm: ProfileFormState = {
  email: "",
  full_name: "",
  phone: "",
  job_title: "",
  bio: "",
  avatar_url: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
};

const initialPasswordForm: PasswordFormState = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

function toFormState(profile: AdminProfile): ProfileFormState {
  return {
    email: profile.email ?? "",
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    job_title: profile.job_title ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    github_url: profile.github_url ?? "",
    portfolio_url: profile.portfolio_url ?? "",
  };
}

function toManageFormState(profile: AdminProfile): ManageAdminForm {
  return {
    full_name: profile.full_name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    job_title: profile.job_title ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    github_url: profile.github_url ?? "",
    portfolio_url: profile.portfolio_url ?? "",
    admin_role: profile.admin_role,
    is_public: Boolean(profile.is_public),
    new_password: "",
  };
}

function formatRole(role: "admin" | "super_admin"): string {
  return role === "super_admin" ? "Super Admin" : "Admin";
}

function asDisplayValue(value: string | null | undefined): string {
  const normalized = String(value ?? "").trim();
  return normalized || "Not set";
}

function toInitials(fullName: string | null | undefined): string {
  const source = String(fullName || "").trim();
  if (!source) {
    return "AD";
  }

  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "AD";
  }

  const first = parts[0]?.charAt(0) ?? "";
  const second = parts.length > 1 ? parts[1]?.charAt(0) ?? "" : parts[0]?.charAt(1) ?? "";
  const initials = `${first}${second}`.trim();
  return initials ? initials.toUpperCase() : "AD";
}

function resolveAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) {
    return null;
  }
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://") || avatarUrl.startsWith("data:")) {
    return avatarUrl;
  }
  const normalizedPath = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;

  try {
    const api = new URL(API_URL);
    return `${api.origin}${normalizedPath}`;
  } catch {
    return `${API_URL.replace(/\/$/, "")}${normalizedPath}`;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function parseImageDataUrl(value: string): { mimeType: string; base64: string } | null {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i.exec(value);
  if (!match) {
    return null;
  }
  return { mimeType: match[1].toLowerCase(), base64: match[2] };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to process image."));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

async function shrinkImageToLimit(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) {
    return file;
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Invalid image file."));
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to process image.");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const candidates: Array<{ type: string; quality: number }> = [
    { type: "image/webp", quality: 0.86 },
    { type: "image/jpeg", quality: 0.84 },
    { type: "image/jpeg", quality: 0.72 },
    { type: "image/jpeg", quality: 0.62 },
  ];

  for (const candidate of candidates) {
    const blob = await canvasToBlob(canvas, candidate.type, candidate.quality);
    if (blob.size <= maxBytes) {
      const extension = candidate.type === "image/webp" ? "webp" : "jpg";
      return new File([blob], `avatar.${extension}`, { type: candidate.type });
    }
  }

  throw new Error("Image is too large. Use a smaller image (max 2MB).");
}

export function MyProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(initialPasswordForm);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [editingAdmin, setEditingAdmin] = useState<AdminProfile | null>(null);
  const [manageForm, setManageForm] = useState<ManageAdminForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [pageError, setPageError] = useState("");
  const [editError, setEditError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [visibilityError, setVisibilityError] = useState("");
  const [manageError, setManageError] = useState("");
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [editModalAvatarLoadFailed, setEditModalAvatarLoadFailed] = useState(false);
  const [manageModalAvatarLoadFailed, setManageModalAvatarLoadFailed] = useState(false);
  const [toastId, setToastId] = useState(1);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const isSuperAdmin = profile?.admin_role === "super_admin";

  const pushToast = (tone: "success" | "error", message: string) => {
    const id = toastId;
    setToastId((current) => current + 1);
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  };

  const dismissToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const fetchAdminsList = async (): Promise<AdminProfile[]> => {
    try {
      return await api<AdminProfile[]>("/api/admins");
    } catch {
      return await api<AdminProfile[]>("/auth/admins");
    }
  };

  const updateMyProfile = async (payload: Record<string, unknown>): Promise<AdminProfile> => {
    try {
      return await api<AdminProfile>("/api/admins/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } catch {
      return await api<AdminProfile>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }
  };

  const updateManagedAdminProfile = async (adminId: number, payload: Record<string, unknown>): Promise<AdminProfile> => {
    try {
      return await api<AdminProfile>(`/api/admins/${adminId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } catch {
      return await api<AdminProfile>(`/auth/admins/${adminId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }
  };

  const fetchMyProfile = async (): Promise<AdminProfile> => {
    try {
      return await api<AdminProfile>("/api/admins/me");
    } catch {
      return await api<AdminProfile>("/auth/me");
    }
  };

  const loadMyProfile = async (includeAdmins: boolean) => {
    const me = await fetchMyProfile();
    setProfile(me);
    setForm(toFormState(me));

    if (includeAdmins && me.admin_role === "super_admin") {
      try {
        const adminList = await fetchAdminsList();
        setAdmins(adminList);
      } catch {
        setAdmins([]);
      }
    }
  };

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setPageError("");
      try {
        if (!active) {
          return;
        }
        await loadMyProfile(true);
      } catch (err) {
        if (!active) {
          return;
        }
        setProfile(null);
        if (err instanceof ApiError) {
          setPageError(err.message || "Failed to load profile from database.");
        } else {
          setPageError("Failed to load profile from database.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async () => {
    const payload: Record<string, unknown> = {
      email: form.email.trim(),
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      job_title: form.job_title.trim(),
      bio: form.bio.trim(),
      avatar_url: form.avatar_url.trim(),
      linkedin_url: form.linkedin_url.trim(),
      github_url: form.github_url.trim(),
      portfolio_url: form.portfolio_url.trim(),
    };

    if (!String(payload.full_name || "").trim()) {
      setEditError("Full name is required.");
      return;
    }
    if (!String(payload.email || "").trim()) {
      setEditError("Email is required.");
      return;
    }

    setIsSaving(true);
    setEditError("");

    try {
      const avatarInput = String(payload.avatar_url || "");
      if (avatarInput.startsWith("data:image/")) {
        const parsed = parseImageDataUrl(avatarInput);
        if (!parsed) {
          setEditError("Invalid avatar image data. Please re-select the image.");
          setIsSaving(false);
          return;
        }

        const uploaded = await api<{ avatar_url: string }>("/api/admins/me/avatar", {
          method: "POST",
          body: JSON.stringify({
            filename: "avatar-upload",
            mime_type: parsed.mimeType,
            data_base64: parsed.base64,
          }),
        });
        payload.avatar_url = uploaded.avatar_url;
        setForm((current) => ({ ...current, avatar_url: uploaded.avatar_url }));
      }

      const updated = await updateMyProfile(payload);
      setProfile(updated);
      setForm(toFormState(updated));
      setIsEditProfileOpen(false);
      setUser({
        id: updated.id,
        email: updated.email ?? "",
        full_name: updated.full_name,
        admin_role: updated.admin_role,
        job_title: updated.job_title ?? "",
      });
      window.dispatchEvent(new Event("dh-auth-updated"));
      setAdmins((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      pushToast("success", "Profile updated successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        setEditError(err.message || "Failed to update profile.");
      } else if (err instanceof Error && err.message) {
        setEditError(err.message);
      } else {
        setEditError("Failed to update profile.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    let file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setEditError("Only JPG, PNG, and WEBP files are allowed.");
      return;
    }

    setIsUploadingAvatar(true);
    setEditError("");

    try {
      file = await shrinkImageToLimit(file, 2 * 1024 * 1024);
      const dataUrl = await fileToDataUrl(file);
      setForm((current) => ({ ...current, avatar_url: dataUrl }));
      setEditModalAvatarLoadFailed(false);
      pushToast("success", "Avatar ready. Save profile to apply.");
    } catch (err) {
      if (err instanceof ApiError) {
        setEditError(err.message || "Failed to upload avatar.");
      } else if (err instanceof Error && err.message) {
        setEditError(err.message);
      } else {
        setEditError("Failed to upload avatar.");
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const openManageAdmin = (target: AdminProfile) => {
    setEditingAdmin(target);
    setManageForm(toManageFormState(target));
    setManageError("");
    setManageModalAvatarLoadFailed(false);
  };

  const closeManageAdmin = () => {
    if (isSavingAdmin) {
      return;
    }
    setEditingAdmin(null);
    setManageForm(null);
  };

  const openEditProfile = () => {
    setEditError("");
    setIsEditProfileOpen(true);
    void (async () => {
      try {
        await loadMyProfile(false);
      } catch {
        setEditError("Failed to load latest profile data.");
      }
    })();
  };

  const closeEditProfile = () => {
    if (isSaving || isUploadingAvatar) {
      return;
    }
    setIsEditProfileOpen(false);
    setEditError("");
  };

  const openPasswordModal = () => {
    setPasswordError("");
    setPasswordForm(initialPasswordForm);
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    if (isSavingPassword) {
      return;
    }
    setIsPasswordModalOpen(false);
    setPasswordError("");
    setPasswordForm(initialPasswordForm);
  };

  const savePassword = async () => {
    if (!passwordForm.current_password.trim() || !passwordForm.new_password.trim() || !passwordForm.confirm_password.trim()) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);
    setPasswordError("");
    try {
      await updateMyProfile({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      closePasswordModal();
      pushToast("success", "Password changed successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordError(err.message || "Failed to change password.");
      } else {
        setPasswordError("Failed to change password.");
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  const openVisibilityModal = () => {
    setVisibilityError("");
    setIsVisibilityModalOpen(true);
  };

  const closeVisibilityModal = () => {
    if (isSavingVisibility) {
      return;
    }
    setIsVisibilityModalOpen(false);
    setVisibilityError("");
  };

  const toggleVisibility = async () => {
    if (!profile) {
      return;
    }

    setIsSavingVisibility(true);
    setVisibilityError("");
    try {
      const updated = await updateMyProfile({
        is_public: !profile.is_public,
      });
      setProfile(updated);
      setForm(toFormState(updated));
      setAdmins((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      closeVisibilityModal();
      pushToast(
        "success",
        updated.is_public
          ? "Profile is now public on the Digital Hub website."
          : "Profile is now private on the Digital Hub website.",
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setVisibilityError(err.message || "Failed to update profile visibility.");
      } else {
        setVisibilityError("Failed to update profile visibility.");
      }
    } finally {
      setIsSavingVisibility(false);
    }
  };

  const saveManagedAdmin = async () => {
    if (!editingAdmin || !manageForm) {
      return;
    }

    if (!manageForm.full_name.trim()) {
      setManageError("Full name is required.");
      return;
    }
    if (!manageForm.email.trim() && !manageForm.phone.trim()) {
      setManageError("Provide at least one of email or phone.");
      return;
    }
    if (manageForm.new_password.trim() && manageForm.new_password.trim().length < 8) {
      setManageError("New password must be at least 8 characters.");
      return;
    }

    setIsSavingAdmin(true);
    setManageError("");

    try {
      const updated = await updateManagedAdminProfile(editingAdmin.id, {
        full_name: manageForm.full_name.trim(),
        email: manageForm.email.trim(),
        phone: manageForm.phone.trim(),
        job_title: manageForm.job_title.trim(),
        bio: manageForm.bio.trim(),
        avatar_url: manageForm.avatar_url.trim(),
        linkedin_url: manageForm.linkedin_url.trim(),
        github_url: manageForm.github_url.trim(),
        portfolio_url: manageForm.portfolio_url.trim(),
        admin_role: manageForm.admin_role,
        is_public: manageForm.is_public,
        new_password: manageForm.new_password.trim() || undefined,
      });
      setAdmins((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingAdmin(null);
      setManageForm(null);
      pushToast("success", "Admin updated successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        setManageError(err.message || "Failed to update admin.");
      } else {
        setManageError("Failed to update admin.");
      }
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const avatarSrc = useMemo(() => resolveAvatarUrl(profile?.avatar_url || null), [profile?.avatar_url]);
  const avatarInitials = useMemo(() => toInitials(profile?.full_name), [profile?.full_name]);
  const editModalAvatarSrc = useMemo(() => resolveAvatarUrl(form.avatar_url || null), [form.avatar_url]);
  const editModalAvatarInitials = useMemo(() => toInitials(form.full_name), [form.full_name]);
  const manageModalAvatarSrc = useMemo(
    () => resolveAvatarUrl((manageForm?.avatar_url || "").trim() || null),
    [manageForm?.avatar_url],
  );
  const manageModalAvatarInitials = useMemo(() => toInitials(manageForm?.full_name), [manageForm?.full_name]);
  const managedAdmins = useMemo(
    () => admins.filter((item) => item.id !== profile?.id),
    [admins, profile?.id],
  );
  const profileLinkedinUrl = (profile?.linkedin_url || "").trim();
  const profileGithubUrl = (profile?.github_url || "").trim();
  const profilePortfolioUrl = (profile?.portfolio_url || "").trim();

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarSrc]);

  useEffect(() => {
    setEditModalAvatarLoadFailed(false);
  }, [editModalAvatarSrc]);

  useEffect(() => {
    setManageModalAvatarLoadFailed(false);
  }, [manageModalAvatarSrc]);

  return (
    <PageShell title="My Profile" subtitle="Your profile data from admin_profiles.">
      <Card>
        {loading ? <p className="info-text">Loading profile...</p> : null}
        {pageError ? <p className="alert alert--error">{pageError}</p> : null}

        <div className="profile-main profile-main--between">
          {avatarSrc && !avatarLoadFailed ? (
            <img
              className="profile-avatar profile-avatar--image"
              src={avatarSrc}
              alt={profile?.full_name || "Profile"}
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <span
              className="profile-avatar"
              aria-hidden
              style={{
                background: "linear-gradient(180deg, #f3f9ff 0%, #e7f2ff 100%)",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {avatarInitials}
            </span>
          )}

          <div className="profile-main__identity">
            <h3 className="section-title">{profile?.full_name || "My Account"}</h3>
            <p className="info-text">{asDisplayValue(profile?.email)}</p>
            <div className="profile-badges">
              {profile ? <Badge tone="default">{formatRole(profile.admin_role)}</Badge> : null}
              {profile ? (
                <Badge tone={profile.is_active ? "resolved" : "draft"}>{profile.is_active ? "Active" : "Inactive"}</Badge>
              ) : null}
              {profile ? (
                <Badge tone={profile.is_public ? "resolved" : "draft"}>
                  {profile.is_public ? "Public on website" : "Private on website"}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="profile-header-actions">
            <button className="btn btn--glass-blue btn--sm" type="button" onClick={openEditProfile} disabled={loading}>
              Edit Profile
            </button>
            <button className="btn btn--glass-blue btn--sm" type="button" onClick={openVisibilityModal} disabled={loading}>
              {profile?.is_public ? "Toggle Private" : "Toggle Public"}
            </button>
            <button className="btn btn--glass-blue btn--sm" type="button" onClick={openPasswordModal} disabled={loading}>
              Change Password
            </button>
          </div>
        </div>

        <div className="profile-info-grid">
          <div className="post-details profile-info-card">
            <h4 className="section-title">Account Details</h4>
            <p className="post-details__line"><strong>Full Name:</strong> {asDisplayValue(profile?.full_name)}</p>
            <p className="post-details__line"><strong>Email:</strong> {asDisplayValue(profile?.email)}</p>
            <p className="post-details__line"><strong>Phone:</strong> {asDisplayValue(profile?.phone)}</p>
            <p className="post-details__line"><strong>Role:</strong> {profile ? formatRole(profile.admin_role) : "Not set"}</p>
            <p className="post-details__line"><strong>Status:</strong> {profile ? (profile.is_active ? "Active" : "Inactive") : "Not set"}</p>
            <p className="post-details__line"><strong>Public Profile:</strong> {profile ? (profile.is_public ? "Public" : "Private") : "Not set"}</p>
          </div>

          <div className="post-details profile-info-card">
            <h4 className="section-title">Professional & Links</h4>
            <p className="post-details__line"><strong>Job Title:</strong> {asDisplayValue(profile?.job_title)}</p>
            <p className="post-details__line"><strong>Bio:</strong> {asDisplayValue(profile?.bio)}</p>
            <p className="post-details__line">
              <strong>LinkedIn:</strong>{" "}
              {profileLinkedinUrl ? <a href={profileLinkedinUrl} target="_blank" rel="noreferrer">{profileLinkedinUrl}</a> : "Not set"}
            </p>
            <p className="post-details__line">
              <strong>GitHub:</strong>{" "}
              {profileGithubUrl ? <a href={profileGithubUrl} target="_blank" rel="noreferrer">{profileGithubUrl}</a> : "Not set"}
            </p>
            <p className="post-details__line">
              <strong>Portfolio:</strong>{" "}
              {profilePortfolioUrl ? <a href={profilePortfolioUrl} target="_blank" rel="noreferrer">{profilePortfolioUrl}</a> : "Not set"}
            </p>
          </div>
        </div>
      </Card>

      {isSuperAdmin ? (
        <Card className="card--table">
          <h3 className="section-title">Manage Admins</h3>
          <p className="info-text">Super admin can update role, password, and profile fields for other admins.</p>
          <Table<AdminProfile>
            rows={managedAdmins}
            rowKey={(row) => row.id}
            emptyMessage="No admin records found."
            columns={[
              { key: "name", label: "Name", className: "table-cell-strong", render: (row) => row.full_name },
              { key: "email", label: "Email", render: (row) => row.email || "N/A" },
              { key: "role", label: "Role", render: (row) => <Badge tone="default">{formatRole(row.admin_role)}</Badge> },
              { key: "public", label: "Public", render: (row) => <Badge tone={row.is_public ? "resolved" : "draft"}>{row.is_public ? "Public" : "Private"}</Badge> },
              { key: "status", label: "Status", render: (row) => <Badge tone="default">{row.is_active ? "Active" : "Inactive"}</Badge> },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="table-actions">
                    <button className="btn btn--secondary btn--sm" type="button" onClick={() => openManageAdmin(row)}>
                      Edit
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      ) : null}

      {isEditProfileOpen ? (
        <div className="modal-overlay modal-overlay--profile" role="presentation" onClick={closeEditProfile}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Edit My Profile</h3>
            </header>

            <div className="profile-modal-sections">
              <section className="profile-modal-section">
                <h4 className="section-title">Account</h4>
                <div className="form-stack">
                  <label className="field">
                    <span className="field__label">Email</span>
                    <input
                      className="field__control"
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      disabled={loading}
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Full Name</span>
                    <input
                      className="field__control"
                      type="text"
                      value={form.full_name}
                      onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                      disabled={loading}
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Phone</span>
                    <input
                      className="field__control"
                      type="tel"
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                      disabled={loading}
                    />
                  </label>
                </div>
              </section>

              <section className="profile-modal-section">
                <h4 className="section-title">Profile Content</h4>
                <div className="form-stack">
                  <label className="field">
                    <span className="field__label">Job Title</span>
                    <input
                      className="field__control"
                      type="text"
                      value={form.job_title}
                      onChange={(event) => setForm((current) => ({ ...current, job_title: event.target.value }))}
                      disabled={loading}
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Bio</span>
                    <textarea
                      className="textarea-control"
                      value={form.bio}
                      onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                      disabled={loading}
                    />
                  </label>
                </div>
              </section>

              <section className="profile-modal-section">
                <h4 className="section-title">Avatar & Links</h4>
                <div className="form-stack">
                  <div className="modal-avatar-preview" aria-live="polite">
                    {editModalAvatarSrc && !editModalAvatarLoadFailed ? (
                      <img
                        className="profile-avatar profile-avatar--image modal-avatar-preview__media"
                        src={editModalAvatarSrc}
                        alt="Admin avatar preview"
                        onError={() => setEditModalAvatarLoadFailed(true)}
                      />
                    ) : (
                      <span className="profile-avatar modal-avatar-preview__media" aria-hidden>
                        {editModalAvatarInitials}
                      </span>
                    )}
                    <p className="modal-avatar-preview__hint">Avatar Preview</p>
                  </div>
                  <label className="field">
                    <span className="field__label">Avatar Upload</span>
                    <input className="field__control" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} disabled={isUploadingAvatar || loading} />
                  </label>
                  <label className="field">
                    <span className="field__label">Avatar URL</span>
                    <input
                      className="field__control"
                      type="url"
                      value={form.avatar_url}
                      onChange={(event) => {
                        setEditModalAvatarLoadFailed(false);
                        setForm((current) => ({ ...current, avatar_url: event.target.value }));
                      }}
                      disabled={loading}
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">LinkedIn URL</span>
                    <input
                      className="field__control"
                      type="url"
                      value={form.linkedin_url}
                      onChange={(event) => setForm((current) => ({ ...current, linkedin_url: event.target.value }))}
                      disabled={loading}
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">GitHub URL</span>
                    <input
                      className="field__control"
                      type="url"
                      value={form.github_url}
                      onChange={(event) => setForm((current) => ({ ...current, github_url: event.target.value }))}
                      disabled={loading}
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Portfolio URL</span>
                    <input
                      className="field__control"
                      type="url"
                      value={form.portfolio_url}
                      onChange={(event) => setForm((current) => ({ ...current, portfolio_url: event.target.value }))}
                      disabled={loading}
                    />
                  </label>
                </div>
              </section>
            </div>

            {editError ? <p className="alert alert--error">{editError}</p> : null}

            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={closeEditProfile} disabled={isSaving || isUploadingAvatar}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={saveProfile} disabled={isSaving || isUploadingAvatar}>
                {isSaving ? "Saving..." : isUploadingAvatar ? "Uploading..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isPasswordModalOpen ? (
        <div className="modal-overlay" role="presentation" onClick={closePasswordModal}>
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Change Password</h3>
            </header>
            <div className="form-stack">
              <label className="field">
                <span className="field__label">Current Password</span>
                <input
                  className="field__control"
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.current_password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">New Password</span>
                <input
                  className="field__control"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.new_password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">Confirm New Password</span>
                <input
                  className="field__control"
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirm_password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))}
                />
              </label>
            </div>
            {passwordError ? <p className="alert alert--error">{passwordError}</p> : null}
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={closePasswordModal} disabled={isSavingPassword}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={savePassword} disabled={isSavingPassword}>
                {isSavingPassword ? "Saving..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isVisibilityModalOpen ? (
        <div className="modal-overlay" role="presentation" onClick={closeVisibilityModal}>
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Confirm Profile Visibility</h3>
            </header>
            <div className="post-details">
              <p className="post-details__line">
                This action will {profile?.is_public ? "hide" : "publish"} your profile on the Digital Hub website.
              </p>
              <p className="post-details__line">
                Current: <strong>{profile?.is_public ? "Public" : "Private"}</strong>
              </p>
              <p className="post-details__line">
                New: <strong>{profile?.is_public ? "Private" : "Public"}</strong>
              </p>
            </div>
            {visibilityError ? <p className="alert alert--error">{visibilityError}</p> : null}
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={closeVisibilityModal} disabled={isSavingVisibility}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={toggleVisibility} disabled={isSavingVisibility}>
                {isSavingVisibility ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingAdmin && manageForm ? (
        <div className="modal-overlay modal-overlay--profile" role="presentation" onClick={closeManageAdmin}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Edit Admin</h3>
            </header>
            <div className="form-stack">
              <div className="modal-avatar-preview" aria-live="polite">
                {manageModalAvatarSrc && !manageModalAvatarLoadFailed ? (
                  <img
                    className="profile-avatar profile-avatar--image modal-avatar-preview__media"
                    src={manageModalAvatarSrc}
                    alt="Managed admin avatar preview"
                    onError={() => setManageModalAvatarLoadFailed(true)}
                  />
                ) : (
                  <span className="profile-avatar modal-avatar-preview__media" aria-hidden>
                    {manageModalAvatarInitials}
                  </span>
                )}
                <p className="modal-avatar-preview__hint">Avatar Preview</p>
              </div>
              <label className="field">
                <span className="field__label">Full Name</span>
                <input
                  className="field__control"
                  type="text"
                  value={manageForm.full_name}
                  onChange={(event) => setManageForm((current) => (current ? { ...current, full_name: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Email</span>
                <input
                  className="field__control"
                  type="email"
                  value={manageForm.email}
                  onChange={(event) => setManageForm((current) => (current ? { ...current, email: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Phone</span>
                <input
                  className="field__control"
                  type="text"
                  value={manageForm.phone}
                  onChange={(event) => setManageForm((current) => (current ? { ...current, phone: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Admin Role</span>
                <select
                  className="field__control"
                  value={manageForm.admin_role}
                  onChange={(event) => setManageForm((current) => (current ? { ...current, admin_role: event.target.value as "admin" | "super_admin" } : current))}
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </label>
              <label className="cohort-form-switch">
                <span className="field__label">Public Profile</span>
                <input
                  className="cohort-form-switch__checkbox"
                  type="checkbox"
                  checked={manageForm.is_public}
                  onChange={(event) => setManageForm((current) => (current ? { ...current, is_public: event.target.checked } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Job Title</span>
                <input
                  className="field__control"
                  type="text"
                  value={manageForm.job_title}
                  onChange={(event) => setManageForm((current) => (current ? { ...current, job_title: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Avatar URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={manageForm.avatar_url}
                  onChange={(event) => {
                    setManageModalAvatarLoadFailed(false);
                    setManageForm((current) => (current ? { ...current, avatar_url: event.target.value } : current));
                  }}
                />
              </label>
              <label className="field">
                <span className="field__label">LinkedIn URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={manageForm.linkedin_url}
                  onChange={(event) => setManageForm((current) => (current ? { ...current, linkedin_url: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">GitHub URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={manageForm.github_url}
                  onChange={(event) => setManageForm((current) => (current ? { ...current, github_url: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Portfolio URL</span>
                <input
                  className="field__control"
                  type="url"
                  value={manageForm.portfolio_url}
                  onChange={(event) => setManageForm((current) => (current ? { ...current, portfolio_url: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Bio</span>
                <textarea
                  className="textarea-control"
                  value={manageForm.bio}
                  onChange={(event) => setManageForm((current) => (current ? { ...current, bio: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field__label">Reset Password</span>
                <input
                  className="field__control"
                  type="password"
                  value={manageForm.new_password}
                  onChange={(event) => setManageForm((current) => (current ? { ...current, new_password: event.target.value } : current))}
                  placeholder="Leave blank to keep existing password"
                />
              </label>
            </div>
            {manageError ? <p className="alert alert--error">{manageError}</p> : null}
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={closeManageAdmin} disabled={isSavingAdmin}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={saveManagedAdmin} disabled={isSavingAdmin}>
                {isSavingAdmin ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PageShell>
  );
}
