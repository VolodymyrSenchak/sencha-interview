import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { InterviewStore } from '../interview-store';

@Component({
  selector: 'app-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCardModule],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class Results {
  protected readonly store = inject(InterviewStore);
  private readonly router = inject(Router);

  protected newInterview(): void {
    this.store.restartInterview();
    void this.router.navigate(['/interview']);
  }
}
