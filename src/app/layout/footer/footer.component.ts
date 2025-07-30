import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { JCode } from '../../shared/utils/JCode';
import { LinkNames } from '../../shared/utils/LinkNames';
import { ToastService } from '../../core/services/toast.service';
import { ToastStatus } from '../../shared/utils/ToastStatus';
import { CommonService } from 'src/app/core/services/common.service';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent implements OnInit{
  response: any;
  dictLinks: any;
  currentYear: number = new Date().getFullYear();

  constructor(
    private commonService: CommonService,
    private toastService: ToastService,
    private router: Router
  ){}

  ngOnInit(): void {
    this.getAllConfigs();
  }

  goToHome() {
    this.router.navigate(['']);
  }

  getAllConfigs() {
    this.commonService.getAllConfig().subscribe(res => {
      this.response = res;

      if (this.response.status == JCode.SUCCESS) {
        this.dictLinks = this.response.data.baseLinks;
      } else {
        this.toastService.show("Load configs error", ToastStatus.ERROR);
      }
    })
  }

  get facebookLink() {
    return this.dictLinks ? this.dictLinks[LinkNames.FACEBOOK] : "#";
  }

  get linkedInLink() {
    return this.dictLinks ? this.dictLinks[LinkNames.LINKEDIN] : "#";
  }

  get telegramLink() {
    return this.dictLinks ? this.dictLinks[LinkNames.TELEGRAM] : "#";
  }

  get githubLink() {
    return this.dictLinks ? this.dictLinks[LinkNames.GITHUB] : "#";
  }
}
