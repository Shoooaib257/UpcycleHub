import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function About() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
        About Upcycle Hub
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-muted-foreground mb-4">
            Upcycle Hub is dedicated to promoting sustainability through creative reuse and upcycling. 
            We provide a platform where artisans, creators, and eco-conscious individuals can buy and 
            sell unique upcycled products, giving new life to materials that might otherwise end up in landfills.
          </p>
          <p className="text-muted-foreground mb-4">
            Our mission is to reduce waste, inspire creativity, and build a community around 
            sustainable practices that benefit both people and the planet.
          </p>
          <Button asChild className="mt-4">
            <Link href="/browse">Browse Products</Link>
          </Button>
        </div>
        
        <div className="bg-muted rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">What is Upcycling?</h2>
          <p className="mb-3">
            Upcycling transforms by-products, waste materials, or unwanted products into new materials 
            or products of better quality or environmental value.
          </p>
          <p>
            Unlike recycling, which often breaks down materials, upcycling maintains the integrity 
            of the original material while creating something of higher value or utility.
          </p>
        </div>
      </div>
      
      <Separator className="my-10" />
      
      <h2 className="text-3xl font-bold mb-6">How It Works</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>For Sellers</CardTitle>
            <CardDescription>List your upcycled creations</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Create an account, upload photos of your upcycled products, set prices, 
              and connect with buyers who appreciate your creativity and commitment to sustainability.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>For Collectors</CardTitle>
            <CardDescription>Find unique sustainable items</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Browse our marketplace for one-of-a-kind upcycled products, support artisans 
              directly, and add sustainable, conversation-starting pieces to your home or wardrobe.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>For Everyone</CardTitle>
            <CardDescription>Join our community</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Exchange ideas, share techniques, and be inspired. Upcycle Hub is more than a marketplace—it's 
              a community dedicated to creative reuse and environmental consciousness.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Separator className="my-10" />
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-6">Join Our Mission</h2>
        <p className="max-w-2xl mx-auto mb-8">
          Whether you're a creator, collector, or simply curious about sustainable living, 
          Upcycle Hub welcomes you to join our community and be part of the solution.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild variant="default">
            <Link href="/browse">Browse Products</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}