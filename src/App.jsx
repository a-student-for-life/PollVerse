import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CreatePoll from './pages/CreatePoll';
import PollView from './pages/PollView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="create" element={<CreatePoll />} />
          <Route path="poll/:id" element={<PollView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
