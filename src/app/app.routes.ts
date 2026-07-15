import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'manage' },
  { path: 'manage', loadComponent: () => import('./manage/manage').then((m) => m.Manage) },
  {
    path: 'interview',
    loadComponent: () => import('./interview/interview').then((m) => m.Interview),
  },
  { path: 'results', loadComponent: () => import('./results/results').then((m) => m.Results) },
  { path: '**', redirectTo: 'manage' },
];
