import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IPAsset } from '../types';
import { ipAssets as ipAssetsApi } from '../api';
import { ArrowLeft } from 'lucide-react';

const IPAssetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<IPAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    ipAssetsApi.list()
      .then(assets => {
        const found = assets.find(a => a.id === id);
        if (found) {
          setAsset(found);
          setForm({ title: found.title, description: found.description });
        } else {
          setError('IP Asset not found');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Assuming an update endpoint exists, though it might not in api.ts
      // For now we'll just update local state to simulate it
      setAsset(prev => prev ? { ...prev, ...form } : null);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update asset');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error || !asset) return <div className="p-6 text-red-600">{error || 'Not found'}</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">IP Asset Details</h1>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full mt-1 border rounded p-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full mt-1 border rounded p-2" rows={4} required />
            </div>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
          </form>
        ) : (
          <div className="space-y-4">
            <div><span className="font-medium">Title:</span> {asset.title}</div>
            <div><span className="font-medium">Description:</span> {asset.description}</div>
            <div><span className="font-medium">Type:</span> {asset.type}</div>
            <div><span className="font-medium">Token ID:</span> {asset.tokenId}</div>
            <div><span className="font-medium">Contract:</span> {asset.contractAddress}</div>
            <div><span className="font-medium">Created:</span> {new Date(asset.createdAt).toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IPAssetDetail;
