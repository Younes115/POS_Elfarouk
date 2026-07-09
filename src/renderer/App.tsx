import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Cashier from './pages/Cashier';
import Inventory from './pages/Inventory';
import Expenses from './pages/Expenses';


function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Cashier />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="expenses" element={<Expenses />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
