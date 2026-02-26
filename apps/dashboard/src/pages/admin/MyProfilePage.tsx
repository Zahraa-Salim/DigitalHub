import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { Table } from "../../components/Table";
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
};

type ProfileFormState = {
  full_name: string;
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
  new_password: string;
};

const initialForm: ProfileFormState = {
  full_name: "",
  job_title: "",
  bio: "",
  avatar_url: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
};

function toFormState(profile: AdminProfile): ProfileFormState {
  return {
    full_name: profile.full_name ?? "",
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
    new_password: "",
  };
}

function formatRole(role: "admin" | "super_admin"): string {
  return role === "super_admin" ? "Super Admin" : "Admin";
}

function resolveAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) {
    return null;
  }
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://") || avatarUrl.startsWith("data:")) {
    return avatarUrl;
  }
  return `${API_URL}${avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`}`;
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
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [editingAdmin, setEditingAdmin] = useState<AdminProfile | null>(null);
  const [manageForm, setManageForm] = useState<ManageAdminForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isSuperAdmin = profile?.admin_role === "super_admin";

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
        const adminList = await api<AdminProfile[]>("/api/admins");
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
      setError("");
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
          setError(err.message || "Failed to load profile from database.");
        } else {
          setError("Failed to load profile from database.");
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
      full_name: form.full_name.trim(),
      job_title: form.job_title.trim(),
      bio: form.bio.trim(),
      avatar_url: form.avatar_url.trim(),
      linkedin_url: form.linkedin_url.trim(),
      github_url: form.github_url.trim(),
      portfolio_url: form.portfolio_url.trim(),
    };

    if (!String(payload.full_name || "").trim()) {
      setError("Full name is required.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const avatarInput = String(payload.avatar_url || "");
      if (avatarInput.startsWith("data:image/")) {
        const parsed = parseImageDataUrl(avatarInput);
        if (!parsed) {
          setError("Invalid avatar image data. Please re-select the image.");
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

      const updated = await api<AdminProfile>("/api/admins/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setProfile(updated);
      setForm(toFormState(updated));
      setIsEditProfileOpen(false);
      setUser({
        id: updated.id,
        email: updated.email ?? "",
        full_name: updated.full_name,
        admin_role: updated.admin_role,
      });
      window.dispatchEvent(new Event("dh-auth-updated"));
      setAdmins((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess("Profile updated successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to update profile.");
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Failed to update profile.");
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
      setError("Only JPG, PNG, and WEBP files are allowed.");
      return;
    }

    setIsUploadingAvatar(true);
    setError("");

    try {
      file = await shrinkImageToLimit(file, 2 * 1024 * 1024);
      const dataUrl = await fileToDataUrl(file);
      setForm((current) => ({ ...current, avatar_url: dataUrl }));
      setSuccess("Avatar ready. Click Save Profile to apply it.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to upload avatar.");
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Failed to upload avatar.");
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const openManageAdmin = (target: AdminProfile) => {
    setEditingAdmin(target);
    setManageForm(toManageFormState(target));
    setError("");
    setSuccess("");
  };

  const closeManageAdmin = () => {
    if (isSavingAdmin) {
      return;
    }
    setEditingAdmin(null);
    setManageForm(null);
  };

  const openEditProfile = () => {
    setError("");
    setSuccess("");
    setIsEditProfileOpen(true);
    void (async () => {
      try {
        await loadMyProfile(false);
      } catch {
        setError("Failed to load latest profile data.");
      }
    })();
  };

  const closeEditProfile = () => {
    if (isSaving || isUploadingAvatar) {
      return;
    }
    setIsEditProfileOpen(false);
    setError("");
  };

  const saveManagedAdmin = async () => {
    if (!editingAdmin || !manageForm) {
      return;
    }

    if (!manageForm.full_name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!manageForm.email.trim() && !manageForm.phone.trim()) {
      setError("Provide at least one of email or phone.");
      return;
    }
    if (manageForm.new_password.trim() && manageForm.new_password.trim().length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setIsSavingAdmin(true);
    setError("");

    try {
      const updated = await api<AdminProfile>(`/api/admins/${editingAdmin.id}`, {
        method: "PUT",
        body: JSON.stringify({
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
          new_password: manageForm.new_password.trim() || undefined,
        }),
      });
      setAdmins((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingAdmin(null);
      setManageForm(null);
      setSuccess("Admin updated successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to update admin.");
      } else {
        setError("Failed to update admin.");
      }
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const avatarSrc = useMemo(() => resolveAvatarUrl(profile?.avatar_url || null), [profile?.avatar_url]);
  const managedAdmins = useMemo(
    () => admins.filter((item) => item.id !== profile?.id),
    [admins, profile?.id],
  );

  return (
    <PageShell title="My Profile" subtitle="Your profile data from admin_profiles.">
      {success ? (
        <Card>
          <p className="alert alert--success">{success}</p>
        </Card>
      ) : null}

      <Card>
        {loading ? <p className="info-text">Loading profile...</p> : null}
        {error ? <p className="alert alert--error">{error}</p> : null}
        <div className="profile-main">
          {avatarSrc ? (
            <img className="profile-avatar profile-avatar--image" src={avatarSrc} alt={profile?.full_name || "Profile"} />
          ) : (
            <span className="profile-avatar" aria-hidden>
              {(profile?.full_name || "A").charAt(0)}
            </span>
          )}
          <div>
            <h3 className="section-title">{profile?.full_name || "My Account"}</h3>
            <p className="info-text">{profile?.email || "No email"}</p>
            {profile?.phone ? <p className="info-text">{profile.phone}</p> : null}
            {profile?.job_title ? <p className="info-text">{profile.job_title}</p> : null}
          </div>
        </div>
        {profile?.bio ? <p className="info-text">{profile.bio}</p> : null}
        {profile ? (
          <div className="profile-badges">
            {profile.linkedin_url ? (
              <a className="btn btn--secondary btn--sm" href={profile.linkedin_url} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            ) : null}
            {profile.github_url ? (
              <a className="btn btn--secondary btn--sm" href={profile.github_url} target="_blank" rel="noreferrer">
                GitHub
              </a>
            ) : null}
            {profile.portfolio_url ? (
              <a className="btn btn--secondary btn--sm" href={profile.portfolio_url} target="_blank" rel="noreferrer">
                Portfolio
              </a>
            ) : null}
          </div>
        ) : null}
        {profile ? (
          <div className="profile-badges">
            <Badge tone="default">{formatRole(profile.admin_role)}</Badge>
            <Badge tone="default">{profile.is_active ? "Active" : "Inactive"}</Badge>
          </div>
        ) : null}
        <div className="mobile-profile-card__actions">
          <button className="btn btn--secondary btn--sm" type="button" onClick={openEditProfile} disabled={loading}>
            Edit Profile
          </button>
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
        <div className="modal-overlay" role="presentation" onClick={closeEditProfile}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Edit My Profile</h3>
            </header>

            <div className="form-stack">
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
                  onChange={(event) => setForm((current) => ({ ...current, avatar_url: event.target.value }))}
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

            {error ? <p className="alert alert--error">{error}</p> : null}

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

      {editingAdmin && manageForm ? (
        <div className="modal-overlay" role="presentation" onClick={closeManageAdmin}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Edit Admin</h3>
            </header>
            <div className="form-stack">
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
                  onChange={(event) => setManageForm((current) => (current ? { ...current, avatar_url: event.target.value } : current))}
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
            {error ? <p className="alert alert--error">{error}</p> : null}
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
    </PageShell>
  );
}
