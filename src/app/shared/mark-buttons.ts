import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonToggle } from '@angular/material/button-toggle';

const MARKS = [0, 1, 2, 3, 4, 5];

@Component({
  selector: 'app-mark-buttons',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonToggle],
  template: `
    @for (value of marks; track value) {
      <mat-button-toggle
        [checked]="value === mark()"
        [disabled]="disabled()"
        [attr.data-mark]="value"
        (change)="toggle(value)"
        class="marks"
      >
        {{ value }}
      </mat-button-toggle>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 2px;

      // Callers can widen/narrow the whole scale from one place.
      --mark-button-width: 25px;
    }

    mat-button-toggle {
      width: var(--mark-button-width);

      // Only the picked mark is coloured (red -> green across 0-5); the rest
      // stay on the default toggle palette so the row doesn't get noisy.
      --mat-button-toggle-selected-state-background-color: var(--mark-color);
      --mat-button-toggle-selected-state-text-color: var(--mark-on-color);

      &[data-mark='0'] {
        --mark-color: #b71c1c;
        --mark-on-color: #fff;
      }
      &[data-mark='1'] {
        --mark-color: #e53935;
        --mark-on-color: #fff;
      }
      &[data-mark='2'] {
        --mark-color: #f28b82;
        --mark-on-color: #3b0d0a;
      }
      &[data-mark='3'] {
        --mark-color: #fbc02d;
        --mark-on-color: #3d2c00;
      }
      &[data-mark='4'] {
        --mark-color: #9ccc65;
        --mark-on-color: #1b3300;
      }
      &[data-mark='5'] {
        --mark-color: #2e7d32;
        --mark-on-color: #fff;
      }
    }

    // Drop the built-in horizontal padding so the fixed width above wins.
    :host ::ng-deep .mat-button-toggle-label-content {
      padding: 0;
      text-align: center;
    }
  `,
})
export class MarkButtons {
  readonly mark = input<number | null>(null);
  readonly disabled = input(false);
  readonly markChange = output<number | null>();

  protected readonly marks = MARKS;

  protected toggle(value: number): void {
    this.markChange.emit(value === this.mark() ? null : value);
  }
}
