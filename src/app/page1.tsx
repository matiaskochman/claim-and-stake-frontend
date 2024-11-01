"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TokenDashboard() {
  const [balance, setBalance] = useState(0);
  const [stakedAmount, setStakedAmount] = useState(0);
  const [stakingStart, setStakingStart] = useState<Date | null>(null);
  const [stakingRewards, setStakingRewards] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (stakingStart && stakedAmount > 0) {
        const elapsedHours =
          (Date.now() - stakingStart.getTime()) / (1000 * 60 * 60);
        const newRewards = stakedAmount * 0.01 * elapsedHours; // 1% por hora
        setStakingRewards(newRewards);
      }
    }, 1000); // Actualizar cada segundo

    return () => clearInterval(timer);
  }, [stakingStart, stakedAmount]);

  const claimTokens = () => {
    setBalance((prevBalance) => prevBalance + 10);
  };

  const stakeTokens = () => {
    if (balance > 0) {
      setStakedAmount((prevStaked) => prevStaked + balance);
      setBalance(0);
      if (!stakingStart) {
        setStakingStart(new Date());
      }
    }
  };

  const unstakeTokens = () => {
    if (stakedAmount > 0) {
      setBalance((prevBalance) => prevBalance + stakedAmount + stakingRewards);
      setStakedAmount(0);
      setStakingStart(null);
      setStakingRewards(0);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Your Token Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span>Balance:</span>
          <span className="font-bold">{balance.toFixed(2)} tokens</span>
        </div>
        <div className="flex justify-between">
          <span>Staked Amount:</span>
          <span className="font-bold">{stakedAmount.toFixed(2)} tokens</span>
        </div>
        {stakingStart && (
          <div className="flex justify-between">
            <span>Staking Time:</span>
            <span className="font-bold">
              {formatDistanceToNow(stakingStart)}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Staking Rewards:</span>
          <span className="font-bold">{stakingRewards.toFixed(2)} tokens</span>
        </div>
        <div className="flex flex-col space-y-2">
          <Button onClick={claimTokens}>Claim 10 Tokens</Button>
          <Button onClick={stakeTokens} disabled={balance === 0}>
            Stake Tokens
          </Button>
          <Button onClick={unstakeTokens} disabled={stakedAmount === 0}>
            Unstake Tokens
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
