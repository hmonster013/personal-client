import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { BlogComponent } from './features/blog/blog.component';
import { AboutComponent } from './features/about/about.component';
import { BlogDetailComponent } from './features/blog-detail/blog-detail.component';
import { URI } from './shared/utils/URI';
import { HeaderComponent } from './layout/header/header.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent
    },
    {
        path: URI.BLOGS,
        component: BlogComponent
    },
    {
        path: URI.ABOUT,
        component: AboutComponent
    },
    {
        path: URI.BLOGS + URI.ID,
        component: BlogDetailComponent
    },
    {
        path: "test",
        component: HeaderComponent
    },
    {
        path: '**/*',
        redirectTo: ''
    }
];
