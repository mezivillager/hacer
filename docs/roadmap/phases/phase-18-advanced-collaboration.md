# Phase 16: Advanced Collaboration Features (Weeks 46-47)

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Priority:** 🟢 MEDIUM  
**Timeline:** Weeks 46-47  
**Dependencies:** Phase 8 complete (basic backend collaboration working)

---

## Overview

This phase enhances the multi-user collaboration system with advanced features like voice/video communication, team workspaces, advanced conflict resolution, and real-time collaboration analytics. It transforms Nand2Fun from a solo design tool into a powerful collaborative platform for circuit development teams.

**Exit Criteria:**
- Real-time voice/video collaboration functional
- Advanced conflict resolution handles complex merge scenarios
- Team workspaces with role-based permissions operational
- Collaboration analytics provide insights into team productivity
- Cross-user undo/redo functionality working seamlessly

---

## 16.1 Voice/Video Collaboration System

**Requirements:** Real-time audio/video communication integrated with circuit design workflow.

### WebRTC Communication Infrastructure

```typescript
// src/collaboration/webrtc/WebRTCManager.ts
export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  stream?: MediaStream;
  userId: string;
  userName: string;
}

export interface CollaborationSession {
  id: string;
  participants: string[];
  circuitId: string;
  startTime: number;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharingEnabled: boolean;
}

export class WebRTCManager {
  private connections = new Map<string, PeerConnection>();
  private localStream?: MediaStream;
  private sessionId?: string;

  constructor(private signalingServer: SignalingServer) {
    this.setupSignaling();
  }

  async joinSession(sessionId: string, userId: string): Promise<void> {
    this.sessionId = sessionId;

    try {
      // Get local media stream
      this.localStream = await this.getLocalMediaStream();

      // Connect to signaling server
      await this.signalingServer.connect(sessionId, userId);

      // Create peer connections for existing participants
      const participants = await this.signalingServer.getParticipants(sessionId);
      for (const participantId of participants) {
        if (participantId !== userId) {
          await this.createPeerConnection(participantId);
        }
      }
    } catch (error) {
      console.error('Failed to join collaboration session:', error);
      throw error;
    }
  }

  async leaveSession(): Promise<void> {
    // Close all peer connections
    for (const connection of this.connections.values()) {
      connection.connection.close();
    }
    this.connections.clear();

    // Stop local media stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = undefined;
    }

    // Disconnect from signaling server
    await this.signalingServer.disconnect();
    this.sessionId = undefined;
  }

  private async getLocalMediaStream(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      });
    } catch (error) {
      console.warn('Could not get media stream:', error);
      // Return empty stream if media access fails
      return new MediaStream();
    }
  }

  private async createPeerConnection(participantId: string): Promise<void> {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers for production
      ],
    });

    // Add local media stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Create data channel for circuit operations
    const dataChannel = peerConnection.createDataChannel('circuit-ops', {
      ordered: true,
      maxPacketLifeTime: 3000, // 3 seconds
    });

    this.setupDataChannel(dataChannel, participantId);

    // Set up event handlers
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingServer.sendIceCandidate(participantId, event.candidate);
      }
    };

    peerConnection.ontrack = (event) => {
      this.handleRemoteStream(participantId, event.streams[0]);
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(`Peer connection state for ${participantId}:`, peerConnection.connectionState);
    };

    // Store connection
    this.connections.set(participantId, {
      id: participantId,
      connection: peerConnection,
      dataChannel,
      userId: participantId,
      userName: await this.getParticipantName(participantId),
    });

    // Initiate connection
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await this.signalingServer.sendOffer(participantId, offer);
  }

  private setupDataChannel(dataChannel: RTCDataChannel, participantId: string): void {
    dataChannel.onopen = () => {
      console.log(`Data channel opened for ${participantId}`);
    };

    dataChannel.onmessage = (event) => {
      try {
        const operation = JSON.parse(event.data);
        this.handleRemoteOperation(participantId, operation);
      } catch (error) {
        console.error('Failed to parse remote operation:', error);
      }
    };

    dataChannel.onclose = () => {
      console.log(`Data channel closed for ${participantId}`);
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error for ${participantId}:`, error);
    };
  }

  private handleRemoteStream(participantId: string, stream: MediaStream): void {
    const connection = this.connections.get(participantId);
    if (connection) {
      connection.stream = stream;
      // Emit event for UI to handle remote stream
      this.emit('remote-stream', { participantId, stream });
    }
  }

  private async handleRemoteOperation(participantId: string, operation: CircuitOperation): Promise<void> {
    // Apply operational transform
    const transformedOperation = await this.applyOperationalTransform(operation);

    // Apply operation to local circuit
    this.applyCircuitOperation(transformedOperation);

    // Broadcast to other participants
    this.broadcastOperation(transformedOperation, participantId);
  }

  private async applyOperationalTransform(operation: CircuitOperation): Promise<CircuitOperation> {
    // Apply operational transform against pending operations
    // This prevents conflicts in collaborative editing
    return operation; // Simplified implementation
  }

  private applyCircuitOperation(operation: CircuitOperation): void {
    // Apply operation to circuit state
    // This would integrate with the existing circuit store
  }

  private broadcastOperation(operation: CircuitOperation, excludeParticipant?: string): void {
    for (const [participantId, connection] of this.connections.entries()) {
      if (participantId !== excludeParticipant && connection.dataChannel.readyState === 'open') {
        connection.dataChannel.send(JSON.stringify(operation));
      }
    }
  }

  private setupSignaling(): void {
    this.signalingServer.on('participant-joined', (participantId: string) => {
      this.createPeerConnection(participantId);
    });

    this.signalingServer.on('participant-left', (participantId: string) => {
      const connection = this.connections.get(participantId);
      if (connection) {
        connection.connection.close();
        this.connections.delete(participantId);
        this.emit('participant-left', participantId);
      }
    });

    this.signalingServer.on('offer', async (participantId: string, offer: RTCSessionDescriptionInit) => {
      await this.handleOffer(participantId, offer);
    });

    this.signalingServer.on('answer', async (participantId: string, answer: RTCSessionDescriptionInit) => {
      await this.handleAnswer(participantId, answer);
    });

    this.signalingServer.on('ice-candidate', async (participantId: string, candidate: RTCIceCandidateInit) => {
      await this.handleIceCandidate(participantId, candidate);
    });
  }

  // Event emitter pattern
  private eventListeners = new Map<string, Function[]>();

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // Placeholder methods (would be implemented based on actual backend)
  private async getParticipantName(participantId: string): Promise<string> {
    return `User ${participantId}`;
  }

  private async handleOffer(participantId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    // Handle incoming offer
  }

  private async handleAnswer(participantId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    // Handle incoming answer
  }

  private async handleIceCandidate(participantId: string, candidate: RTCIceCandidateInit): Promise<void> {
    // Handle ICE candidate
  }
}
```

### Collaboration UI Components

```typescript
// src/components/collaboration/CollaborationPanel.tsx
import { useEffect, useState } from 'react';
import { WebRTCManager, CollaborationSession } from '../../collaboration/webrtc/WebRTCManager';
import { VideoTile } from './VideoTile';
import { ParticipantList } from './ParticipantList';
import { CollaborationControls } from './CollaborationControls';

interface CollaborationPanelProps {
  session: CollaborationSession;
  onLeaveSession: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
}

export function CollaborationPanel({
  session,
  onLeaveSession,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
}: CollaborationPanelProps) {
  const [participants, setParticipants] = useState(session.participants);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [webRTC] = useState(() => new WebRTCManager(signalingServer));

  useEffect(() => {
    // Join session
    webRTC.joinSession(session.id, currentUser.id);

    // Listen for remote streams
    webRTC.on('remote-stream', ({ participantId, stream }: { participantId: string; stream: MediaStream }) => {
      setRemoteStreams(prev => new Map(prev.set(participantId, stream)));
    });

    // Listen for participant changes
    webRTC.on('participant-left', (participantId: string) => {
      setParticipants(prev => prev.filter(id => id !== participantId));
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(participantId);
        return newStreams;
      });
    });

    return () => {
      webRTC.leaveSession();
    };
  }, [session.id, webRTC]);

  return (
    <div className="collaboration-panel">
      <div className="collaboration-header">
        <h3>Collaboration Session</h3>
        <div className="session-info">
          <span className="participant-count">{participants.length} participants</span>
          <span className="session-duration">
            {formatDuration(Date.now() - session.startTime)}
          </span>
        </div>
      </div>

      <div className="video-grid">
        {/* Local video tile */}
        <VideoTile
          stream={localStream}
          userName={currentUser.name}
          isLocal={true}
          muted={true}
        />

        {/* Remote video tiles */}
        {Array.from(remoteStreams.entries()).map(([participantId, stream]) => (
          <VideoTile
            key={participantId}
            stream={stream}
            userName={getParticipantName(participantId)}
            isLocal={false}
            muted={false}
          />
        ))}
      </div>

      <ParticipantList participants={participants} />

      <CollaborationControls
        audioEnabled={session.audioEnabled}
        videoEnabled={session.videoEnabled}
        screenSharingEnabled={session.screenSharingEnabled}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
        onToggleScreenShare={onToggleScreenShare}
        onLeaveSession={onLeaveSession}
      />
    </div>
  );
}
```

---

## 16.2 Team Workspaces & Permissions

**Requirements:** Role-based access control and team management for collaborative circuit development.

### Workspace Management System

```typescript
// src/collaboration/workspaces/WorkspaceManager.ts
export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: WorkspaceMember[];
  circuits: WorkspaceCircuit[];
  settings: WorkspaceSettings;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  permissions: WorkspacePermission[];
  joinedAt: number;
  lastActiveAt: number;
}

export interface WorkspaceCircuit {
  circuitId: string;
  name: string;
  description?: string;
  permissions: CircuitPermission[];
  collaborators: string[]; // User IDs currently editing
  lastModified: number;
  version: number;
}

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type WorkspacePermission = 'manage-members' | 'manage-circuits' | 'manage-settings' | 'delete-workspace';
export type CircuitPermission = 'read' | 'write' | 'admin' | 'share';

export class WorkspaceManager {
  private workspaces = new Map<string, Workspace>();

  async createWorkspace(ownerId: string, name: string, description?: string): Promise<Workspace> {
    const workspace: Workspace = {
      id: generateId(),
      name,
      description: description || '',
      ownerId,
      members: [{
        userId: ownerId,
        role: 'owner',
        permissions: ['manage-members', 'manage-circuits', 'manage-settings', 'delete-workspace'],
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
      }],
      circuits: [],
      settings: this.getDefaultSettings(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.workspaces.set(workspace.id, workspace);
    await this.persistWorkspace(workspace);

    return workspace;
  }

  async addMember(workspaceId: string, userId: string, role: WorkspaceRole, inviterId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    // Check permissions
    if (!this.hasPermission(workspace, inviterId, 'manage-members')) {
      throw new Error('Insufficient permissions');
    }

    // Check if user is already a member
    if (workspace.members.some(m => m.userId === userId)) {
      throw new Error('User is already a member');
    }

    const permissions = this.getPermissionsForRole(role);
    workspace.members.push({
      userId,
      role,
      permissions,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
    });

    workspace.updatedAt = Date.now();
    await this.persistWorkspace(workspace);

    // Notify other members
    await this.notifyMembers(workspaceId, {
      type: 'member-added',
      memberId: userId,
      role,
      invitedBy: inviterId,
    });
  }

  async createCircuit(
    workspaceId: string,
    creatorId: string,
    name: string,
    description?: string
  ): Promise<WorkspaceCircuit> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    if (!this.hasPermission(workspace, creatorId, 'manage-circuits')) {
      throw new Error('Insufficient permissions');
    }

    const circuit: WorkspaceCircuit = {
      circuitId: generateId(),
      name,
      description,
      permissions: ['read', 'write', 'admin'], // Creator gets all permissions
      collaborators: [creatorId],
      lastModified: Date.now(),
      version: 1,
    };

    workspace.circuits.push(circuit);
    workspace.updatedAt = Date.now();
    await this.persistWorkspace(workspace);

    return circuit;
  }

  async shareCircuit(
    workspaceId: string,
    circuitId: string,
    sharerId: string,
    targetUserId: string,
    permissions: CircuitPermission[]
  ): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    const circuit = workspace.circuits.find(c => c.circuitId === circuitId);
    if (!circuit) throw new Error('Circuit not found');

    // Check if sharer has admin permission on the circuit
    if (!circuit.permissions.includes('admin')) {
      throw new Error('Insufficient permissions to share circuit');
    }

    // Add user to collaborators if they have write permission
    if (permissions.includes('write') && !circuit.collaborators.includes(targetUserId)) {
      circuit.collaborators.push(targetUserId);
    }

    await this.persistWorkspace(workspace);
  }

  private hasPermission(workspace: Workspace, userId: string, permission: WorkspacePermission): boolean {
    const member = workspace.members.find(m => m.userId === userId);
    return member?.permissions.includes(permission) || false;
  }

  private getPermissionsForRole(role: WorkspaceRole): WorkspacePermission[] {
    switch (role) {
      case 'owner':
        return ['manage-members', 'manage-circuits', 'manage-settings', 'delete-workspace'];
      case 'admin':
        return ['manage-members', 'manage-circuits', 'manage-settings'];
      case 'editor':
        return ['manage-circuits'];
      case 'viewer':
        return [];
      default:
        return [];
    }
  }

  private getDefaultSettings(): WorkspaceSettings {
    return {
      isPublic: false,
      allowGuestAccess: false,
      maxMembers: 50,
      maxCircuits: 100,
      features: {
        realTimeCollaboration: true,
        versionHistory: true,
        comments: true,
        analytics: true,
      },
    };
  }

  private async persistWorkspace(workspace: Workspace): Promise<void> {
    // Persist to backend storage
    // This would integrate with the actual backend API
  }

  private async notifyMembers(workspaceId: string, notification: any): Promise<void> {
    // Send real-time notifications to workspace members
  }
}
```

### Advanced Conflict Resolution

```typescript
// src/collaboration/conflicts/ConflictResolver.ts
export interface Conflict {
  id: string;
  type: 'concurrent-edit' | 'delete-conflict' | 'permission-denied';
  participants: string[];
  affectedElements: string[]; // Gate IDs, wire IDs, etc.
  timestamp: number;
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  type: 'merge' | 'override' | 'reject' | 'manual';
  resolvedBy: string;
  resolvedAt: number;
  appliedOperations: CircuitOperation[];
  rejectedOperations: CircuitOperation[];
}

export class ConflictResolver {
  private conflicts = new Map<string, Conflict>();
  private resolutionStrategies = new Map<string, ConflictResolutionStrategy>();

  constructor() {
    this.setupDefaultStrategies();
  }

  async detectConflict(operation: CircuitOperation, existingOperations: CircuitOperation[]): Promise<Conflict | null> {
    // Check for concurrent edits on the same element
    const conflictingOps = existingOperations.filter(op =>
      this.operationsConflict(operation, op)
    );

    if (conflictingOps.length > 0) {
      return {
        id: generateId(),
        type: 'concurrent-edit',
        participants: [...new Set(conflictingOps.map(op => op.userId))],
        affectedElements: this.getAffectedElements(operation),
        timestamp: Date.now(),
      };
    }

    return null;
  }

  async resolveConflict(conflict: Conflict, strategy: string = 'auto'): Promise<ConflictResolution> {
    const resolutionStrategy = this.resolutionStrategies.get(strategy) || this.resolutionStrategies.get('auto')!;

    try {
      const resolution = await resolutionStrategy.resolve(conflict);

      conflict.resolution = resolution;
      this.conflicts.set(conflict.id, conflict);

      return resolution;
    } catch (error) {
      // Fallback to manual resolution
      return {
        type: 'manual',
        resolvedBy: 'system',
        resolvedAt: Date.now(),
        appliedOperations: [],
        rejectedOperations: conflict.affectedElements.map(() => ({} as CircuitOperation)),
      };
    }
  }

  private operationsConflict(op1: CircuitOperation, op2: CircuitOperation): boolean {
    // Check if operations affect the same circuit elements
    if (op1.type === 'addGate' && op2.type === 'deleteGate') {
      return op1.gateId === op2.gateId;
    }

    if (op1.type === 'moveGate' && op2.type === 'moveGate') {
      return op1.gateId === op2.gateId;
    }

    if (op1.type === 'addWire' && op2.type === 'deleteWire') {
      return op1.wireId === op2.wireId;
    }

    // Add more conflict detection rules as needed
    return false;
  }

  private getAffectedElements(operation: CircuitOperation): string[] {
    switch (operation.type) {
      case 'addGate':
      case 'deleteGate':
      case 'moveGate':
      case 'rotateGate':
        return [operation.gateId];
      case 'addWire':
      case 'deleteWire':
        return [operation.wireId];
      default:
        return [];
    }
  }

  private setupDefaultStrategies(): void {
    // Auto-merge strategy for compatible operations
    this.resolutionStrategies.set('auto', {
      name: 'Auto-merge',
      description: 'Automatically merge compatible operations',
      resolve: async (conflict: Conflict) => {
        // Simple auto-merge: prefer the most recent operation
        const sortedOps = conflict.affectedElements.sort((a, b) => {
          // Sort by timestamp (would need actual operation data)
          return 0;
        });

        return {
          type: 'merge',
          resolvedBy: 'system',
          resolvedAt: Date.now(),
          appliedOperations: [], // Would contain merged operations
          rejectedOperations: [],
        };
      },
    });

    // Last-writer-wins strategy
    this.resolutionStrategies.set('last-writer-wins', {
      name: 'Last Writer Wins',
      description: 'Apply the most recent operation',
      resolve: async (conflict: Conflict) => {
        return {
          type: 'override',
          resolvedBy: 'system',
          resolvedAt: Date.now(),
          appliedOperations: [], // Most recent operation
          rejectedOperations: [], // Older operations
        };
      },
    });
  }

  registerStrategy(name: string, strategy: ConflictResolutionStrategy): void {
    this.resolutionStrategies.set(name, strategy);
  }

  getAvailableStrategies(): string[] {
    return Array.from(this.resolutionStrategies.keys());
  }
}
```

---

## 16.3 Collaboration Analytics

**Requirements:** Track and analyze team collaboration patterns to improve productivity and identify bottlenecks.

### Collaboration Metrics Collector

```typescript
// src/analytics/collaboration/CollaborationMetrics.ts
export interface CollaborationMetrics {
  sessionMetrics: SessionMetrics;
  userMetrics: UserMetrics;
  circuitMetrics: CircuitMetrics;
  conflictMetrics: ConflictMetrics;
  productivityMetrics: ProductivityMetrics;
}

export interface SessionMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  peakConcurrentUsers: number;
  totalCollaborationTime: number;
  sessionsByDayOfWeek: Record<string, number>;
  sessionsByHour: Record<string, number>;
}

export interface UserMetrics {
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  userRetentionRate: number;
  averageSessionDuration: number;
  userRolesDistribution: Record<string, number>;
}

export interface CircuitMetrics {
  totalCircuitsCreated: number;
  circuitsEditedCollaboratively: number;
  averageCollaboratorsPerCircuit: number;
  mostEditedCircuits: Array<{ circuitId: string; edits: number }>;
  circuitComplexityDistribution: Record<string, number>;
}

export interface ConflictMetrics {
  totalConflicts: number;
  resolvedConflicts: number;
  averageResolutionTime: number;
  conflictsByType: Record<string, number>;
  conflictsByUser: Record<string, number>;
}

export interface ProductivityMetrics {
  editsPerHour: number;
  circuitsCompletedPerWeek: number;
  averageTimeToCompleteCircuit: number;
  collaborationEfficiency: number; // Ratio of collaborative vs solo work
}

export class CollaborationAnalytics {
  private metrics: CollaborationMetrics;
  private eventBuffer: CollaborationEvent[] = [];
  private flushInterval: number;

  constructor() {
    this.metrics = this.initializeMetrics();
    this.flushInterval = setInterval(() => this.flushEvents(), 30000); // Flush every 30 seconds
  }

  trackEvent(event: CollaborationEvent): void {
    this.eventBuffer.push(event);

    // Update real-time metrics
    this.updateRealTimeMetrics(event);

    // Check buffer size and flush if needed
    if (this.eventBuffer.length >= 100) {
      this.flushEvents();
    }
  }

  private updateRealTimeMetrics(event: CollaborationEvent): void {
    switch (event.type) {
      case 'session-started':
        this.metrics.sessionMetrics.totalSessions++;
        break;

      case 'user-joined':
        this.metrics.userMetrics.activeUsers++;
        break;

      case 'circuit-edited':
        this.updateCircuitMetrics(event);
        break;

      case 'conflict-detected':
        this.metrics.conflictMetrics.totalConflicts++;
        this.metrics.conflictMetrics.conflictsByType[event.conflictType] =
          (this.metrics.conflictMetrics.conflictsByType[event.conflictType] || 0) + 1;
        break;

      case 'conflict-resolved':
        this.metrics.conflictMetrics.resolvedConflicts++;
        // Update resolution time calculation
        break;
    }
  }

  private updateCircuitMetrics(event: CollaborationEvent): void {
    if (event.type === 'circuit-edited') {
      const circuit = this.metrics.circuitMetrics.mostEditedCircuits.find(
        c => c.circuitId === event.circuitId
      );

      if (circuit) {
        circuit.edits++;
      } else {
        this.metrics.circuitMetrics.mostEditedCircuits.push({
          circuitId: event.circuitId,
          edits: 1,
        });
      }

      // Keep only top 10 most edited circuits
      this.metrics.circuitMetrics.mostEditedCircuits.sort((a, b) => b.edits - a.edits);
      this.metrics.circuitMetrics.mostEditedCircuits = this.metrics.circuitMetrics.mostEditedCircuits.slice(0, 10);
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const events = [...this.eventBuffer];
      this.eventBuffer = [];

      // Send to analytics backend
      await this.sendEventsToBackend(events);

      // Update persistent metrics
      await this.updatePersistentMetrics(events);
    } catch (error) {
      console.error('Failed to flush collaboration events:', error);
      // Re-queue failed events
      this.eventBuffer.unshift(...this.eventBuffer.splice(0, this.eventBuffer.length));
    }
  }

  private async sendEventsToBackend(events: CollaborationEvent[]): Promise<void> {
    // Send events to analytics service
    await fetch('/api/analytics/collaboration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
  }

  private async updatePersistentMetrics(events: CollaborationEvent[]): Promise<void> {
    // Update metrics in persistent storage
    const updatedMetrics = this.calculateUpdatedMetrics(events);
    await this.persistMetrics(updatedMetrics);
  }

  private calculateUpdatedMetrics(events: CollaborationEvent[]): Partial<CollaborationMetrics> {
    // Calculate updated metrics from events
    return {};
  }

  private async persistMetrics(metrics: Partial<CollaborationMetrics>): Promise<void> {
    // Persist metrics to backend
    await fetch('/api/analytics/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
    });
  }

  getMetrics(): CollaborationMetrics {
    return { ...this.metrics };
  }

  getRealTimeStats(): RealTimeCollaborationStats {
    return {
      activeUsers: this.metrics.userMetrics.activeUsers,
      activeSessions: this.metrics.sessionMetrics.totalSessions,
      ongoingConflicts: this.metrics.conflictMetrics.totalConflicts - this.metrics.conflictMetrics.resolvedConflicts,
      recentActivity: this.getRecentActivity(),
    };
  }

  private getRecentActivity(): CollaborationActivity[] {
    // Return recent collaboration activities
    return [];
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushEvents(); // Final flush
  }
}

// Hook for components to track collaboration
export function useCollaborationTracking() {
  const trackEvent = (event: CollaborationEvent) => {
    // Get analytics instance and track event
  };

  return { trackEvent };
}
```

---

## 16.4 Phase 16 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| WebRTC infrastructure design | 8h | Phase 8 complete | <100ms connection setup | Real-time comms architecture complete |
| Voice/video implementation | 12h | WebRTC design | <500ms media latency | Audio/video calls working |
| Signaling server integration | 8h | Voice/video | <50ms signaling latency | Peer connection establishment working |
| Screen sharing support | 6h | Signaling | - | Screen sharing functional |
| Team workspace architecture | 8h | Screen sharing | - | Workspace management system designed |
| Role-based permissions | 10h | Workspace arch | <100ms permission checks | RBAC system implemented |
| Advanced conflict resolution | 12h | Permissions | <200ms conflict resolution | Complex merge scenarios handled |
| Operational transform enhancement | 8h | Conflict resolution | <50ms transform time | Cross-user undo/redo working |
| Collaboration UI components | 10h | OT enhancement | - | Video tiles, participant lists complete |
| Real-time presence indicators | 6h | UI components | - | User online/offline status working |
| Collaboration analytics setup | 8h | Presence indicators | - | Team productivity metrics collected |
| Performance monitoring | 6h | Analytics | <100ms metrics collection | Real-time collaboration stats available |
| Cross-platform testing | 8h | Performance monitoring | - | Collaboration works across browsers/devices |

**Total Estimated Effort:** ~110 hours (5.5 weeks with 1 developer)  
**Performance Budget:** <100ms connection setup, <500ms media latency, <200ms conflict resolution  
**Quality Gates:** Voice/video calls functional, complex conflicts resolved automatically, collaboration analytics operational

---

## Risk Mitigation

**WebRTC Browser Compatibility:** Implement fallbacks for browsers without WebRTC support and test extensively across platforms.

**Network Reliability Issues:** Design for intermittent connectivity with automatic reconnection and offline queuing.

**Scalability Concerns:** Start with small group collaboration and design architecture to scale to larger teams.

**Privacy in Collaboration:** Ensure all media streams are encrypted and implement user consent for recording/screen sharing.

---

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Previous:** [Phase 15: Mobile & Touch Optimization](phase-15-mobile-touch.md)  
**Next:** [Phase 17: Analytics & Insights](phase-17-analytics-insights.md)
