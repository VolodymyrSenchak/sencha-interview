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
    }
  `,
})
export class MarkButtons {
  readonly mark = input<number | null>(null);
  readonly markChange = output<number | null>();

  protected readonly marks = MARKS;

  protected toggle(value: number): void {
    this.markChange.emit(value === this.mark() ? null : value);
  }
}
