'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type {
  AdminTenantUser,
  AdminTenantUserMutationResponse,
  TenantPlan,
  UserRole,
  VerticalKey,
} from '@agentmou/contracts';
import {
  ArrowLeft,
  ArrowRightLeft,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/lib/auth/store';
import { useDataProvider } from '@/lib/providers/context';
import { useProviderQuery } from '@/lib/data/use-provider-query';

const USER_ROLE_OPTIONS: UserRole[] = ['owner', 'admin', 'operator', 'viewer'];
const VERTICAL_OPTIONS: VerticalKey[] = ['internal', 'clinic', 'fisio'];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed';
}

function formatPlan(plan: TenantPlan) {
  return plan.replace('_', ' ');
}

function formatRole(role: UserRole) {
  return role[0].toUpperCase() + role.slice(1);
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return 'Never';
  }

  return new Date(value).toLocaleString();
}

function MutationAlert({
  result,
}: {
  result: AdminTenantUserMutationResponse['activation'] | null;
}) {
  if (!result) {
    return null;
  }

  return (
    <Alert className="border-emerald-500/30 bg-emerald-500/5">
      <Shield className="h-4 w-4 text-emerald-600" />
      <AlertTitle>Activation payload listo</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>El usuario nuevo todavia no tiene password. Puedes usar este enlace de activacion:</p>
        <a
          href={result.link}
          target="_blank"
          rel="noreferrer"
          className="break-all text-emerald-700 underline underline-offset-4"
        >
          {result.link}
        </a>
        <p className="text-xs text-muted-foreground">Expira: {formatTimestamp(result.expiresAt)}</p>
      </AlertDescription>
    </Alert>
  );
}

export function AdminTenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const provider = useDataProvider();
  const replaceSessionToken = useAuthStore((state) => state.replaceSessionToken);
  const adminTenantId = params.tenantId as string;
  const managedTenantId = params.managedTenantId as string;
  const [reloadKey, setReloadKey] = React.useState(0);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<AdminTenantUser | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<AdminTenantUser | null>(null);
  const [verticalOpen, setVerticalOpen] = React.useState(false);
  const [impersonationUser, setImpersonationUser] = React.useState<AdminTenantUser | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<string | null>(null);

  const [createEmail, setCreateEmail] = React.useState('');
  const [createName, setCreateName] = React.useState('');
  const [createRole, setCreateRole] = React.useState<UserRole>('operator');
  const [activation, setActivation] = React.useState<
    AdminTenantUserMutationResponse['activation'] | null
  >(null);

  const [editName, setEditName] = React.useState('');
  const [editRole, setEditRole] = React.useState<UserRole>('operator');

  const [verticalDraft, setVerticalDraft] = React.useState<VerticalKey>('clinic');
  const [impersonationReason, setImpersonationReason] = React.useState('');

  const {
    data: detail,
    error: detailError,
    isLoading: isLoadingDetail,
  } = useProviderQuery(
    (dataProvider) => dataProvider.getAdminTenantDetail(adminTenantId, managedTenantId),
    null,
    [adminTenantId, managedTenantId, reloadKey]
  );
  const {
    data: users,
    error: usersError,
    isLoading: isLoadingUsers,
  } = useProviderQuery(
    (dataProvider) => dataProvider.listAdminTenantUsers(adminTenantId, managedTenantId),
    [] as AdminTenantUser[],
    [adminTenantId, managedTenantId, reloadKey]
  );

  React.useEffect(() => {
    if (detail) {
      setVerticalDraft(detail.activeVertical);
    }
  }, [detail]);

  React.useEffect(() => {
    if (editUser) {
      setEditName(editUser.name ?? '');
      setEditRole(editUser.role);
    }
  }, [editUser]);

  const refresh = React.useCallback(() => setReloadKey((value) => value + 1), []);

  const handleCreateUser = React.useCallback(async () => {
    if (!createEmail.trim()) {
      toast.error('El email es obligatorio');
      return;
    }

    setIsSubmitting('create-user');
    try {
      const response = await provider.createAdminTenantUser(adminTenantId, managedTenantId, {
        email: createEmail.trim(),
        name: createName.trim() || undefined,
        role: createRole,
      });

      refresh();
      setActivation(response.activation ?? null);
      setCreateEmail('');
      setCreateName('');
      setCreateRole('operator');
      toast.success('Usuario creado correctamente');

      if (!response.activation) {
        setCreateOpen(false);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(null);
    }
  }, [adminTenantId, createEmail, createName, createRole, managedTenantId, provider, refresh]);

  const handleUpdateUser = React.useCallback(async () => {
    if (!editUser) {
      return;
    }

    const nextName = editName.trim();
    const hasNameChange = nextName !== (editUser.name ?? '');
    const hasRoleChange = editRole !== editUser.role;

    if (!hasNameChange && !hasRoleChange) {
      toast.error('No hay cambios para guardar');
      return;
    }

    setIsSubmitting('edit-user');
    try {
      await provider.updateAdminTenantUser(adminTenantId, managedTenantId, editUser.userId, {
        ...(hasNameChange ? { name: nextName || undefined } : {}),
        ...(hasRoleChange ? { role: editRole } : {}),
      });

      refresh();
      setEditUser(null);
      toast.success('Usuario actualizado');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(null);
    }
  }, [adminTenantId, editName, editRole, editUser, managedTenantId, provider, refresh]);

  const handleDeleteUser = React.useCallback(async () => {
    if (!deleteUser) {
      return;
    }

    setIsSubmitting('delete-user');
    try {
      await provider.deleteAdminTenantUser(adminTenantId, managedTenantId, deleteUser.userId);
      refresh();
      setDeleteUser(null);
      toast.success('Membership eliminada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(null);
    }
  }, [adminTenantId, deleteUser, managedTenantId, provider, refresh]);

  const handleChangeVertical = React.useCallback(async () => {
    if (!detail || verticalDraft === detail.activeVertical) {
      setVerticalOpen(false);
      return;
    }

    setIsSubmitting('change-vertical');
    try {
      await provider.changeAdminTenantVertical(adminTenantId, managedTenantId, {
        activeVertical: verticalDraft,
      });
      refresh();
      setVerticalOpen(false);
      toast.success('Vertical actualizada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(null);
    }
  }, [adminTenantId, detail, managedTenantId, provider, refresh, verticalDraft]);

  const handleStartImpersonation = React.useCallback(async () => {
    if (!impersonationUser) {
      return;
    }

    setIsSubmitting('start-impersonation');
    try {
      const response = await provider.startAdminImpersonation(adminTenantId, managedTenantId, {
        targetUserId: impersonationUser.userId,
        reason: impersonationReason.trim() || undefined,
      });

      await replaceSessionToken(response.impersonationToken, {
        preferredTenantId: managedTenantId,
        impersonationRestoreToken: response.restoreToken,
        maxAgeDays: 1 / 48,
      });

      router.replace(`/app/${managedTenantId}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(null);
    }
  }, [
    adminTenantId,
    impersonationReason,
    impersonationUser,
    managedTenantId,
    provider,
    replaceSessionToken,
    router,
  ]);

  if (isLoadingDetail && !detail) {
    return (
      <div className="p-6 text-sm text-muted-foreground lg:p-8">Cargando tenant gestionado...</div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/app/${adminTenantId}/admin/tenants`}>
            <ArrowLeft className="h-4 w-4" />
            Volver a tenants
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {detailError?.message ?? 'Tenant no encontrado'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={`/app/${adminTenantId}/admin/tenants`}>
              <ArrowLeft className="h-4 w-4" />
              Volver a tenants
            </Link>
          </Button>
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.12em] text-muted-foreground">Admin</p>
            <h1 className="text-3xl font-semibold tracking-tight">{detail.name}</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Cambia la vertical activa, opera memberships y entra en impersonation sobre usuarios
              reales del tenant sin perder el contexto del workspace admin.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setVerticalOpen(true)}>
            <ArrowRightLeft className="h-4 w-4" />
            Cambiar vertical
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Crear usuario
          </Button>
        </div>
      </div>

      {usersError ? (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>No pudimos cargar los usuarios</AlertTitle>
          <AlertDescription>{usersError.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_minmax(320px,1fr)]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Tenant summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Plan</p>
              <Badge variant="outline" className="capitalize">
                {formatPlan(detail.plan)}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Vertical</p>
              <Badge variant="secondary" className="capitalize">
                {detail.activeVertical}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Users</p>
              <p className="text-sm font-medium">{detail.userCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Flags</p>
              {detail.isPlatformAdminTenant ? (
                <Badge className="gap-1">
                  <Shield className="h-3 w-3" />
                  Platform admin tenant
                </Badge>
              ) : (
                <Badge variant="outline">Client tenant</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Vertical configs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.verticalConfigs.length > 0 ? (
              detail.verticalConfigs.map((config) => (
                <div key={config.id} className="rounded-2xl border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary" className="capitalize">
                      {config.verticalKey}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Updated {formatTimestamp(config.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Esta config queda preservada aunque cambies la vertical activa del tenant.
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay configs verticales registradas.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-lg">Users and memberships</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestiona roles tenant-scoped y lanza impersonation desde una fila concreta.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            <Users className="h-3 w-3" />
            {detail.userCount} usuarios
          </Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ultima actividad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.membershipId}>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <div className="font-medium">{user.name ?? user.email}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant={user.role === 'owner' ? 'default' : 'outline'}>
                      {formatRole(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant={user.hasPassword ? 'secondary' : 'outline'}>
                      {user.hasPassword ? 'Activo' : 'Pendiente de activacion'}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {formatTimestamp(user.lastActiveAt)}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditUser(user);
                          setActivation(null);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setImpersonationUser(user);
                          setImpersonationReason('');
                        }}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Impersonar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteUser(user)}>
                        <Trash2 className="h-4 w-4" />
                        Borrar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoadingUsers && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Este tenant todavia no tiene memberships visibles.
                  </TableCell>
                </TableRow>
              ) : null}
              {isLoadingUsers ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Cargando usuarios...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setActivation(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear usuario del tenant</DialogTitle>
            <DialogDescription>
              Crea una membership tenant-scoped. Si el usuario es nuevo, devolvemos tambien el
              activation payload para que pueda terminar su alta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-user-email">Email</Label>
              <Input
                id="create-user-email"
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-name">Nombre</Label>
              <Input
                id="create-user-name"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Nombre opcional"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={createRole}
                onValueChange={(value) => setCreateRole(value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {formatRole(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <MutationAlert result={activation} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting === 'create-user'}>
              <Plus className="h-4 w-4" />
              Crear usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editUser)} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar membership</DialogTitle>
            <DialogDescription>
              Ajusta nombre global y rol tenant-scoped del usuario seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Nombre</Label>
              <Input
                id="edit-user-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Nombre visible"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {formatRole(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} disabled={isSubmitting === 'edit-user'}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={verticalOpen} onOpenChange={setVerticalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar vertical activa</DialogTitle>
            <DialogDescription>
              Esto cambia la experiencia por defecto del tenant cuando aterrice en la app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vertical</Label>
              <Select
                value={verticalDraft}
                onValueChange={(value) => setVerticalDraft(value as VerticalKey)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VERTICAL_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Cambio con impacto de routing</AlertTitle>
              <AlertDescription>
                El tenant cambiará su shell y su landing por defecto, pero no perderá configs
                verticales previas.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerticalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangeVertical} disabled={isSubmitting === 'change-vertical'}>
              Confirmar cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(impersonationUser)}
        onOpenChange={(open) => !open && setImpersonationUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar impersonation</DialogTitle>
            <DialogDescription>
              La sesión resultante aterrizará en el tenant target y el banner superior permitirá
              salir y volver al detalle admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Usuario target</AlertTitle>
              <AlertDescription>
                {impersonationUser?.name ?? impersonationUser?.email ?? 'Sin usuario seleccionado'}
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="impersonation-reason">Motivo</Label>
              <Textarea
                id="impersonation-reason"
                value={impersonationReason}
                onChange={(event) => setImpersonationReason(event.target.value)}
                placeholder="Motivo opcional para auditoria"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonationUser(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleStartImpersonation}
              disabled={isSubmitting === 'start-impersonation'}
            >
              Iniciar impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteUser)} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar membership</AlertDialogTitle>
            <AlertDialogDescription>
              Solo se borra la membership de este tenant. Si intentas quitar al ultimo owner, el
              backend bloqueara la operacion y te lo mostraremos aqui.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isSubmitting === 'delete-user'}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
