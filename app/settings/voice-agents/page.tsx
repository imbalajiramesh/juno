'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconPlus, IconMicrophone, IconSettings, IconTrash, IconPlayerPlay, IconPlayerStop, IconVolume, IconHeadphones } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VoiceAgent {
  id: string;
  name: string;
  description: string;
  voice: string;
  script: string;
  status: 'active' | 'inactive';
  createdAt: string;
  phone_number_id?: string;
  assigned_phone?: {
    id: string;
    phone_number: string;
    status: string;
  };
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  status: string;
}

const voiceOptions = [
  { id: 'ash', name: 'Ash', gender: 'Neutral', accent: 'American', description: 'Clear and precise voice, excellent for professional and business conversations' },
  { id: 'coral', name: 'Coral', gender: 'Female', accent: 'American', description: 'Warm and friendly voice, perfect for customer service and support calls' },
];

const COST_PER_MINUTE_CREDITS = 25; // Fixed cost

const sampleTexts = [
  "Hello! I'm calling from your trusted partner. How are you doing today?",
  "Thank you for your interest in our services. Let me help you with your questions.",
  "I'm reaching out to follow up on your recent inquiry. Do you have a moment to chat?",
  "Good morning! I hope you're having a wonderful day. I'd love to tell you about our latest offering.",
];

export default function VoiceAgentsPage() {
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedAgentForTest, setSelectedAgentForTest] = useState<VoiceAgent | null>(null);
  const [isWebTestActive, setIsWebTestActive] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState(sampleTexts[0]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    voice: '',
    script: '',
    phoneNumberId: 'auto',
  });

  useEffect(() => {
    fetchAgents();
    fetchPhoneNumbers();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/voice-agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Error fetching voice agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPhoneNumbers = async () => {
    try {
      const response = await fetch('/api/phone-numbers');
      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(Array.isArray(data) ? data : []);
      } else {
        console.warn('Failed to fetch phone numbers:', response.status);
        setPhoneNumbers([]);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      setPhoneNumbers([]);
    }
  };

  const handleCreateAgent = async () => {
    if (!formData.name || !formData.voice || !formData.script) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const agentData = {
        ...formData,
        phoneNumberId: formData.phoneNumberId === 'auto' ? null : formData.phoneNumberId, // Send null for auto-assign
      };

      const response = await fetch('/api/voice-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });

      if (response.ok) {
        const newAgent = await response.json();
        setAgents(prev => [newAgent, ...prev]);
        setIsCreateModalOpen(false);
        resetForm();
        toast.success('Voice agent created successfully!');
        // Refresh agents to get the assigned phone number data
        fetchAgents();
      } else {
        throw new Error('Failed to create voice agent');
      }
    } catch (error) {
      console.error('Error creating voice agent:', error);
      toast.error('Failed to create voice agent');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      voice: '',
      script: '',
      phoneNumberId: 'auto',
    });
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/voice-agents/${agentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
        toast.success('Voice agent deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting voice agent:', error);
      toast.error('Failed to delete voice agent');
    }
  };

  const handleVoicePreview = async (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      // Stop current playback
      setPlayingVoiceId(null);
      return;
    }

    setPlayingVoiceId(voiceId);
    
    try {
      const response = await fetch('/api/voice-agents/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: voiceId,
          text: previewText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Preview failed');
      }

      const data = await response.json();
      
      if (data.success && data.audioUrl) {
        // Play the real OpenAI voice audio
        const audio = new Audio(data.audioUrl);
        
        audio.onplay = () => setPlayingVoiceId(voiceId);
        audio.onended = () => setPlayingVoiceId(null);
        audio.onerror = () => {
          setPlayingVoiceId(null);
          toast.error('Voice preview failed to play');
        };
        
        await audio.play();
        toast.success('Playing real voice preview!');
      } else {
        setPlayingVoiceId(null);
        toast.error('Failed to generate voice preview');
      }
    } catch (error) {
      console.error('Voice preview error:', error);
      setPlayingVoiceId(null);
      toast.error(error instanceof Error ? error.message : 'Voice preview failed');
    }
  };

  const handleWebTest = async (agent: VoiceAgent) => {
    setSelectedAgentForTest(agent);
    setIsTestModalOpen(true);
  };

  const startWebCall = async () => {
    if (!selectedAgentForTest) return;
    
    setIsWebTestActive(true);
    toast.success('Web test started! Using high-quality real-time voice.');
    
    try {
      const response = await fetch('/api/voice-agents/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: selectedAgentForTest.voice,
          text: selectedAgentForTest.script,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Web test failed');
      }

      const data = await response.json();
      
      if (data.success && data.audioUrl) {
        // Play real OpenAI voice
        const audio = new Audio(data.audioUrl);
        
        audio.onended = () => {
          setTimeout(() => {
            setIsWebTestActive(false);
            toast.success('Web test completed with high-quality voice!');
          }, 1000);
        };
      
        audio.onerror = () => {
          setIsWebTestActive(false);
          toast.error('Audio playback failed');
        };
        
        await audio.play();
      } else {
        setIsWebTestActive(false);
        toast.error('Failed to generate test audio');
      }
    } catch (error) {
      console.error('Web test error:', error);
      setIsWebTestActive(false);
      toast.error(error instanceof Error ? error.message : 'Web test failed');
    }
  };

  const stopWebCall = () => {
    window.speechSynthesis.cancel();
    setIsWebTestActive(false);
    toast.info('Web test stopped');
  };

  const selectedVoice = voiceOptions.find(v => v.id === formData.voice);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Juno Voices</h1>
          <p className="text-muted-foreground">
            Create and manage AI voice agents for automated customer conversations
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <IconPlus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {/* Cost Information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Voice Call Pricing</h3>
              <p className="text-sm text-blue-700">
                Voice calls are charged at {COST_PER_MINUTE_CREDITS} credits per minute with a 1-minute minimum
              </p>
              <p className="text-xs text-blue-600 mt-1">
                💡 Use free voice previews and web tests before creating agents
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">{COST_PER_MINUTE_CREDITS}</div>
              <div className="text-sm text-blue-700">credits/min</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : agents.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IconMicrophone className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No voice agents yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first AI voice agent to start automating customer conversations
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <IconPlus className="mr-2 h-4 w-4" />
                Create Your First Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          agents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{agent.description}</p>
                  </div>
                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Voice</p>
                    <p className="text-sm text-muted-foreground">{agent.voice}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Assigned Phone Number</p>
                    <p className="text-sm text-muted-foreground">
                      {agent.assigned_phone ? agent.assigned_phone.phone_number : 'Auto-assigned (any available)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Cost per minute</p>
                    <p className="text-sm text-muted-foreground">{COST_PER_MINUTE_CREDITS} credits</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleWebTest(agent)}
                    >
                      <IconHeadphones className="mr-2 h-4 w-4" />
                      Test
                    </Button>
                    <Button variant="outline" size="sm">
                      <IconSettings className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Agent Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create AI Voice Agent</DialogTitle>
            <DialogDescription>
              Set up a new AI voice agent with a custom script and voice selection. Preview voices before creating!
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="setup">Agent Setup</TabsTrigger>
              <TabsTrigger value="preview">Voice Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="setup" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sarah Johnson"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voice">Voice Selection *</Label>
                  <Select value={formData.voice} onValueChange={(value) => setFormData(prev => ({ ...prev, voice: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a voice..." />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceOptions.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name} - {voice.gender}, {voice.accent}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of what this agent does..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Assigned Phone Number (Optional)</Label>
                <Select value={formData.phoneNumberId} onValueChange={(value) => setFormData(prev => ({ ...prev, phoneNumberId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a phone number (or leave blank for auto-assignment)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-assign (use any available number)</SelectItem>
                    {phoneNumbers && phoneNumbers.filter(phone => phone.status === 'active').length > 0 ? (
                      phoneNumbers.filter(phone => phone.status === 'active').map((phone) => (
                        <SelectItem key={phone.id} value={phone.id}>
                          {phone.phone_number}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No phone numbers available - purchase a number first
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign a specific phone number to this agent, or leave blank to use any available number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="script">Agent Script *</Label>
                <Textarea
                  id="script"
                  placeholder="Hello, this is [Agent Name] calling from [Company]. I'm reaching out regarding..."
                  value={formData.script}
                  onChange={(e) => setFormData(prev => ({ ...prev, script: e.target.value }))}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  Use variables like [Customer Name], [Company], [Agent Name] in your script
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fixed Cost per Minute</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">{COST_PER_MINUTE_CREDITS} Credits</p>
                    <p className="text-sm text-muted-foreground">
                      All voice calls are charged at this rate
                    </p>
                  </div>
                </div>
                {selectedVoice && (
                  <div className="space-y-2">
                    <Label>Selected Voice</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="font-medium">{selectedVoice.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedVoice.gender}, {selectedVoice.accent} accent
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedVoice.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Preview Text</Label>
                  <Select value={previewText} onValueChange={setPreviewText}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleTexts.map((text, index) => (
                        <SelectItem key={index} value={text}>
                          Sample {index + 1}: {text.substring(0, 60)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">Selected Preview Text:</p>
                    <p className="text-sm text-muted-foreground">{previewText}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {voiceOptions.map((voice) => (
                    <Card key={voice.id} className={`cursor-pointer transition-all ${formData.voice === voice.id ? 'ring-2 ring-blue-500' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{voice.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {voice.gender}, {voice.accent}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVoicePreview(voice.id)}
                            disabled={playingVoiceId !== null && playingVoiceId !== voice.id}
                          >
                            {playingVoiceId === voice.id ? (
                              <IconPlayerStop className="h-4 w-4" />
                            ) : (
                              <IconVolume className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {voice.description}
                        </p>
                        <Button
                          variant={formData.voice === voice.id ? "default" : "outline"}
                          size="sm"
                          className="w-full"
                          onClick={() => setFormData(prev => ({ ...prev, voice: voice.id }))}
                        >
                          {formData.voice === voice.id ? 'Selected' : 'Select Voice'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-2">🎤 Real Voice Previews</h4>
                  <p className="text-sm text-blue-800">
                    Voice previews use high-quality real-time voices that will be used in your live calls. Test different voices with your sample text to find the perfect match!
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAgent} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Agent'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Web Test Modal */}
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Voice Agent: {selectedAgentForTest?.name}</DialogTitle>
            <DialogDescription>
              Experience a free web-based preview of your voice agent before making phone calls
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h4 className="font-medium text-green-900 mb-2">🎧 Free Voice Test</h4>
              <p className="text-sm text-green-800">
                This test uses high-quality real-time voices to preview your agent's voice and script. No call credits required!
              </p>
            </div>

            {selectedAgentForTest && (
              <div className="space-y-3">
                <div>
                  <Label>Agent Script Preview</Label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {selectedAgentForTest.script}
                  </div>
                </div>

                <div>
                  <Label>Selected Voice</Label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {voiceOptions.find(v => v.id === selectedAgentForTest.voice)?.name} - 
                    {voiceOptions.find(v => v.id === selectedAgentForTest.voice)?.description}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              {!isWebTestActive ? (
                <Button onClick={startWebCall} size="lg" className="w-full">
                  <IconPlayerPlay className="mr-2 h-5 w-5" />
                  Start Web Test
                </Button>
              ) : (
                <Button onClick={stopWebCall} variant="destructive" size="lg" className="w-full">
                  <IconPlayerStop className="mr-2 h-5 w-5" />
                  Stop Test
                </Button>
              )}
            </div>

            {isWebTestActive && (
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="animate-pulse text-blue-700">
                  🎙️ Web test in progress...
                </div>
                <p className="text-sm text-blue-600 mt-2">
                  Listening to your agent's greeting and conversation flow
                </p>
              </div>
            )}

            <div className="p-4 bg-gray-50 border rounded-md">
              <h4 className="font-medium mb-2">💸 Ready for Real Calls?</h4>
              <p className="text-sm text-muted-foreground">
                Phone calls cost {COST_PER_MINUTE_CREDITS} credits per minute. Web tests are always free for experimenting!
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsTestModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 