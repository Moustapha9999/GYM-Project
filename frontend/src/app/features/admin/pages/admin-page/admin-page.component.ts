import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { AdminService } from '@features/admin/services/admin.service';
import { Utilisateur } from '@features/admin/models/utilisateur.model';

@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly utilisateurs = signal<Utilisateur[]>([]);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    password: ['', [Validators.required, Validators.minLength(1)]],
    role_nom: ['receptionniste', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadUtilisateurs();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const payload = {
      nom: raw.nom,
      prenom: raw.prenom,
      email: raw.email,
      password: raw.password,
      role_nom: raw.role_nom,
      telephone: raw.telephone || undefined,
    };

    this.adminService.createUtilisateur(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Réceptionniste créé avec succès.');
        this.form.reset({
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          password: '',
          role_nom: 'receptionniste',
        });
        this.loadUtilisateurs();
      },
      error: (err: { error?: { message?: string; detail?: string } }) => {
        this.submitting.set(false);
        const msg = err.error?.message ?? err.error?.detail ?? 'Erreur lors de la création.';
        this.errorMessage.set(msg);
      },
    });
  }

  private loadUtilisateurs(): void {
    this.loading.set(true);
    this.adminService.listUtilisateurs().subscribe({
      next: (users) => {
        this.utilisateurs.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger la liste des utilisateurs.');
        this.loading.set(false);
      },
    });
  }
}
