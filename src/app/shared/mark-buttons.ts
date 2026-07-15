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
        [class.large]="size() === 'large'"
        (change)="toggle(value)"
      >
        {{ value }}
      </mat-button-toggle>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 6px;
    }

    .large {
      --mat-button-toggle-height: 46px;
      --mat-button-toggle-label-text-size: 16px;
    }
  `,
})
export class MarkButtons {
  readonly mark = input<number | null>(null);
  readonly size = input<'small' | 'large'>('small');
  readonly markChange = output<number | null>();

  protected readonly marks = MARKS;

  protected toggle(value: number): void {
    this.markChange.emit(value === this.mark() ? null : value);
  }
}
