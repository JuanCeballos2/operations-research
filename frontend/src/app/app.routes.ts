import { Routes } from '@angular/router';

import { HomeView } from './pages/homes/components/home-view/home-view';
import { GraphicalMethodView } from './pages/graphical-method/components/graphical-method-view/graphical-method-view';
import { SimplexMethodView } from './pages/simplex-method/components/simplex-method-view/simplex-method-view';

export const routes: Routes = [
  {
    path: '',
    component: HomeView,
    pathMatch: 'full',
  },
  {
    path: 'graphical-method',
    component: GraphicalMethodView,
  },

  {
    path: 'simplex-method',
    component: SimplexMethodView,
  },
];
