import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test',
  imports: [CommonModule],
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss']
})
export class TestComponent {
  progressValue = 75;

  increaseProgress() {
    this.progressValue = Math.min(100, this.progressValue + 10);
  }

  decreaseProgress() {
    this.progressValue = Math.max(0, this.progressValue - 10);
  }
}
