"use client";

import { Card, Col, Row, Slider, Switch, Typography } from "antd";

const { Text } = Typography;

interface VideoSettingsProps {
  displayDuration: number;
  transitionDuration: number;
  kenBurns: boolean;
  onDisplayDurationChange: (value: number) => void;
  onTransitionDurationChange: (value: number) => void;
  onKenBurnsChange: (value: boolean) => void;
}

export default function VideoSettings({
  displayDuration,
  transitionDuration,
  kenBurns,
  onDisplayDurationChange,
  onTransitionDurationChange,
  onKenBurnsChange,
}: VideoSettingsProps) {
  return (
    <Card title="Video Settings" size="small">
      <Row gutter={[24, 16]}>
        <Col xs={24} sm={8}>
          <Text strong>Display Duration: {displayDuration}s</Text>
          <Slider
            min={1}
            max={6}
            step={0.5}
            value={displayDuration}
            onChange={onDisplayDurationChange}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Text strong>Transition: {transitionDuration}s</Text>
          <Slider
            min={0}
            max={1}
            step={0.1}
            value={transitionDuration}
            onChange={onTransitionDurationChange}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Text strong>Ken Burns Effect</Text>
          <div style={{ marginTop: 8 }}>
            <Switch
              checked={kenBurns}
              onChange={onKenBurnsChange}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
          </div>
        </Col>
      </Row>
    </Card>
  );
}
